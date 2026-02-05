import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CreateReviewDto,
  CreateChildOrderDto,
  TransitionResponse,
  AvailableTransition,
} from './dto';
import {
  OrderStatus,
  OrderAssignmentType,
  CompanyType,
  OrderTargetStatus,
  ReviewResult,
  OrderOrigin,
} from '@prisma/client';
import {
  ORDER_CREATED,
  ORDER_ACCEPTED,
  ORDER_REJECTED,
  ORDER_STATUS_CHANGED,
  ORDER_FINALIZED,
  OrderCreatedEvent,
  OrderAcceptedEvent,
  OrderRejectedEvent,
  OrderStatusChangedEvent,
} from '../notifications/events/notification.events';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // Status antes do aceite onde ficha deve ser protegida
  private readonly PRE_ACCEPT_STATUSES = [
    OrderStatus.LANCADO_PELA_MARCA,
    OrderStatus.EM_NEGOCIACAO,
    OrderStatus.DISPONIVEL_PARA_OUTRAS,
  ];

  // Mapa de transições válidas por status, papel e flag materialsProvided
  private readonly STATUS_TRANSITIONS: Record<
    string,
    {
      nextStatus: OrderStatus;
      allowedRoles: ('BRAND' | 'SUPPLIER')[];
      requiresMaterials?: boolean; // undefined = qualquer, true = só com insumos, false = só sem insumos
      label: string;
      description: string;
      requiresConfirmation: boolean;
      requiresNotes: boolean;
      requiresReview: boolean;
    }[]
  > = {
    [OrderStatus.LANCADO_PELA_MARCA]: [
      {
        nextStatus: OrderStatus.ACEITO_PELA_FACCAO,
        allowedRoles: ['SUPPLIER'],
        label: 'Aceitar Pedido',
        description: 'Aceitar este pedido e iniciar o fluxo de produção',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: false,
      },
    ],
    [OrderStatus.ACEITO_PELA_FACCAO]: [
      {
        nextStatus: OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
        allowedRoles: ['BRAND'],
        requiresMaterials: true,
        label: 'Preparar Insumos',
        description: 'Iniciar preparação dos insumos para envio à facção',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: false,
      },
      {
        nextStatus: OrderStatus.EM_PRODUCAO,
        allowedRoles: ['SUPPLIER'],
        requiresMaterials: false,
        label: 'Iniciar Produção',
        description: 'Iniciar produção sem aguardar insumos da marca',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: false,
      },
    ],
    [OrderStatus.EM_PREPARACAO_SAIDA_MARCA]: [
      {
        nextStatus: OrderStatus.EM_TRANSITO_PARA_FACCAO,
        allowedRoles: ['BRAND'],
        label: 'Despachar Insumos',
        description: 'Confirmar que os insumos foram despachados para a facção',
        requiresConfirmation: true,
        requiresNotes: true,
        requiresReview: false,
      },
    ],
    [OrderStatus.EM_TRANSITO_PARA_FACCAO]: [
      {
        nextStatus: OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO,
        allowedRoles: ['SUPPLIER'],
        label: 'Confirmar Recebimento',
        description: 'Confirmar que os insumos foram recebidos na facção',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: false,
      },
    ],
    [OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO]: [
      {
        nextStatus: OrderStatus.EM_PRODUCAO,
        allowedRoles: ['SUPPLIER'],
        label: 'Iniciar Produção',
        description: 'Iniciar a produção após conferência dos insumos',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: false,
      },
    ],
    [OrderStatus.EM_PRODUCAO]: [
      {
        nextStatus: OrderStatus.PRONTO,
        allowedRoles: ['SUPPLIER'],
        label: 'Produção Concluída',
        description: 'Marcar a produção como concluída e pronta para envio',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: false,
      },
    ],
    [OrderStatus.PRONTO]: [
      {
        nextStatus: OrderStatus.EM_TRANSITO_PARA_MARCA,
        allowedRoles: ['BRAND', 'SUPPLIER'],
        label: 'Marcar Despacho',
        description: 'Confirmar que o pedido foi despachado para a marca',
        requiresConfirmation: true,
        requiresNotes: true,
        requiresReview: false,
      },
    ],
    [OrderStatus.EM_TRANSITO_PARA_MARCA]: [
      {
        nextStatus: OrderStatus.EM_REVISAO,
        allowedRoles: ['BRAND'],
        label: 'Confirmar Recebimento',
        description: 'Confirmar que o pedido foi recebido e iniciar revisão de qualidade',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: false,
      },
    ],
    [OrderStatus.EM_REVISAO]: [
      {
        nextStatus: OrderStatus.FINALIZADO,
        allowedRoles: ['BRAND'],
        label: 'Aprovar Totalmente',
        description: 'Aprovar 100% do pedido e finalizar',
        requiresConfirmation: true,
        requiresNotes: false,
        requiresReview: true,
      },
      {
        nextStatus: OrderStatus.PARCIALMENTE_APROVADO,
        allowedRoles: ['BRAND'],
        label: 'Aprovação Parcial',
        description: 'Aprovar parcialmente com itens rejeitados ou segunda qualidade',
        requiresConfirmation: true,
        requiresNotes: true,
        requiresReview: true,
      },
      {
        nextStatus: OrderStatus.REPROVADO,
        allowedRoles: ['BRAND'],
        label: 'Reprovar',
        description: 'Reprovar o pedido por problemas de qualidade',
        requiresConfirmation: true,
        requiresNotes: true,
        requiresReview: true,
      },
    ],
  };

  // Mapa de "quem estamos aguardando" por status
  private readonly WAITING_FOR_MAP: Record<string, { waitingFor: 'BRAND' | 'SUPPLIER'; label: string }> = {
    [OrderStatus.LANCADO_PELA_MARCA]: { waitingFor: 'SUPPLIER', label: 'Aguardando a Facção aceitar o pedido' },
    [OrderStatus.ACEITO_PELA_FACCAO]: { waitingFor: 'BRAND', label: 'Aguardando a Marca preparar insumos' },
    [OrderStatus.EM_PREPARACAO_SAIDA_MARCA]: { waitingFor: 'BRAND', label: 'Marca preparando insumos para envio' },
    [OrderStatus.EM_TRANSITO_PARA_FACCAO]: { waitingFor: 'SUPPLIER', label: 'Aguardando a Facção confirmar recebimento' },
    [OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO]: { waitingFor: 'SUPPLIER', label: 'Facção conferindo insumos recebidos' },
    [OrderStatus.EM_PRODUCAO]: { waitingFor: 'SUPPLIER', label: 'Facção em produção' },
    [OrderStatus.PRONTO]: { waitingFor: 'BRAND', label: 'Pronto para despacho' },
    [OrderStatus.EM_TRANSITO_PARA_MARCA]: { waitingFor: 'BRAND', label: 'Aguardando a Marca confirmar recebimento' },
    [OrderStatus.EM_REVISAO]: { waitingFor: 'BRAND', label: 'Marca revisando qualidade' },
  };

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private shouldProtectTechSheet(order: any, isSupplier: boolean): boolean {
    return (
      isSupplier &&
      order.protectTechnicalSheet &&
      this.PRE_ACCEPT_STATUSES.includes(order.status)
    );
  }

  private applyTechSheetProtection(order: any): any {
    return {
      ...order,
      techSheetUrl: null,
      observations: null,
      description: null,
      _techSheetProtected: true, // Flag para UI saber que está protegido
      attachments: order.attachments?.filter((a: any) => a.isPreview) || [],
    };
  }

  // Generate display ID: TX-YYYYMMDD-XXXX
  private generateDisplayId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TX-${dateStr}-${random}`;
  }

  // Generate child display ID: TX-YYYYMMDD-XXXX-R1, R2, etc.
  private generateChildDisplayId(
    parentDisplayId: string,
    revisionNumber: number,
  ): string {
    return `${parentDisplayId}-R${revisionNumber}`;
  }

  // Create order (Brand only)
  async create(dto: CreateOrderDto, userId: string) {
    // Get brand company for this user
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
      include: { company: true },
    });

    if (!companyUser) {
      throw new ForbiddenException(
        'You must have a brand company to create orders',
      );
    }

    const totalValue = dto.quantity * dto.pricePerUnit;
    const platformFeePercentage = 0.1; // 10%
    const platformFee = totalValue * platformFeePercentage;
    const netValue = totalValue - platformFee;

    // Buscar default da marca para proteção de ficha técnica
    const brandSettings = await this.prisma.credentialSettings.findUnique({
      where: { companyId: companyUser.companyId },
      select: { defaultProtectTechnicalSheet: true },
    });

    const protectTechnicalSheet =
      dto.protectTechnicalSheet ??
      brandSettings?.defaultProtectTechnicalSheet ??
      false;

    // Build order data
    const orderData: any = {
      displayId: this.generateDisplayId(),
      brandId: companyUser.companyId,
      status: OrderStatus.LANCADO_PELA_MARCA,
      assignmentType: dto.assignmentType,
      productType: dto.productType,
      productCategory: dto.productCategory,
      productName: dto.productName,
      op: dto.op,
      artigo: dto.artigo,
      description: dto.description,
      quantity: dto.quantity,
      pricePerUnit: dto.pricePerUnit,
      totalValue,
      platformFee,
      netValue,
      deliveryDeadline: new Date(dto.deliveryDeadline),
      paymentTerms: dto.paymentTerms,
      materialsProvided: dto.materialsProvided ?? false,
      observations: dto.observations,
      protectTechnicalSheet,
      statusHistory: {
        create: {
          newStatus: OrderStatus.LANCADO_PELA_MARCA,
          changedById: userId,
          notes: 'Order created',
        },
      },
    };

    // Handle assignment type
    if (dto.assignmentType === OrderAssignmentType.DIRECT) {
      if (!dto.supplierId) {
        throw new BadRequestException(
          'supplierId is required for DIRECT orders',
        );
      }
      orderData.supplierId = dto.supplierId;
    } else if (dto.assignmentType === OrderAssignmentType.BIDDING) {
      if (!dto.targetSupplierIds?.length) {
        throw new BadRequestException(
          'targetSupplierIds is required for BIDDING orders',
        );
      }
      orderData.targetSuppliers = {
        createMany: {
          data: dto.targetSupplierIds.map((supplierId) => ({
            supplierId,
            status: OrderTargetStatus.PENDING,
          })),
        },
      };
    } else if (dto.assignmentType === OrderAssignmentType.HYBRID) {
      // HYBRID: Can have target suppliers (invited) AND is open to others
      if (dto.targetSupplierIds?.length) {
        orderData.targetSuppliers = {
          createMany: {
            data: dto.targetSupplierIds.map((supplierId) => ({
              supplierId,
              status: OrderTargetStatus.PENDING,
            })),
          },
        };
      }
    }

    const order = await this.prisma.order.create({
      data: orderData,
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
        targetSuppliers: true,
        statusHistory: true,
      },
    });

    // Emit order created event
    const event: OrderCreatedEvent = {
      orderId: order.id,
      displayId: order.displayId,
      brandId: order.brandId,
      brandName: order.brand?.tradeName || 'Marca',
      supplierId: order.supplierId || undefined,
      supplierName: order.supplier?.tradeName ?? undefined,
      productName: order.productName,
      quantity: order.quantity,
      totalValue: Number(order.totalValue),
      deadline: order.deliveryDeadline,
      targetSupplierIds: dto.targetSupplierIds,
    };
    this.eventEmitter.emit(ORDER_CREATED, event);
    this.logger.log(`Emitted order.created event for ${order.displayId}`);

    return order;
  }

  // Get my orders (Brand or Supplier)
  async getMyOrders(
    userId: string,
    role: 'BRAND' | 'SUPPLIER',
    status?: OrderStatus,
  ) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: {
          type: role === 'BRAND' ? CompanyType.BRAND : CompanyType.SUPPLIER,
        },
      },
    });

    if (!companyUser) {
      throw new NotFoundException('Company not found');
    }

    const whereClause: any =
      role === 'BRAND'
        ? { brandId: companyUser.companyId }
        : {
            OR: [
              { supplierId: companyUser.companyId },
              {
                targetSuppliers: {
                  some: { supplierId: companyUser.companyId },
                },
              },
              {
                assignmentType: 'HYBRID',
                status: 'LANCADO_PELA_MARCA', // Only show open hybrid orders if they are in initial status
                // Don't show if already assigned (checked by supplierId clause)
                supplierId: null,
              },
            ],
          };

    if (status) {
      whereClause.status = status;
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
        targetSuppliers: {
          include: { supplier: { select: { id: true, tradeName: true } } },
        },
        _count: { select: { messages: true, attachments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Financial Privacy Masking + Tech Sheet Protection for Supplier
    if (role === 'SUPPLIER') {
      return orders.map((order) => {
        let result = {
          ...order,
          totalValue: order.netValue || order.totalValue,
          pricePerUnit: order.netValue
            ? Number(order.netValue) / order.quantity
            : order.pricePerUnit,
          platformFee: undefined,
        };

        if (this.shouldProtectTechSheet(order, true)) {
          result = { ...result, ...this.applyTechSheetProtection(result) };
        }

        return result;
      });
    }

    return orders;
  }

  /**
   * Verifies if the user has access to the order (belongs to brand or supplier)
   * @throws ForbiddenException if user doesn't have access
   */
  private async verifyOrderAccess(
    orderId: string,
    userId: string,
  ): Promise<{
    order: any;
    companyUser: any;
    role: 'BRAND' | 'SUPPLIER';
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        brand: true,
        supplier: true,
        attachments: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { select: { name: true } } },
        },
        targetSuppliers: {
          include: { supplier: { select: { id: true, tradeName: true } } },
        },
        payments: true,
        ratings: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user belongs to the brand
    const brandUser = await this.prisma.companyUser.findFirst({
      where: { userId, companyId: order.brandId },
      include: { company: true },
    });

    if (brandUser) {
      return { order, companyUser: brandUser, role: 'BRAND' };
    }

    // Check if user belongs to the supplier
    if (order.supplierId) {
      const supplierUser = await this.prisma.companyUser.findFirst({
        where: { userId, companyId: order.supplierId },
        include: { company: true },
      });

      if (supplierUser) {
        return { order, companyUser: supplierUser, role: 'SUPPLIER' };
      }
    }

    // Check if user is a target supplier (for BIDDING/HYBRID orders before assignment)
    const targetSupplierMatch = order.targetSuppliers?.find(
      (ts: any) => ts.supplier,
    );
    if (targetSupplierMatch) {
      const targetSupplierUser = await this.prisma.companyUser.findFirst({
        where: {
          userId,
          companyId: {
            in: order.targetSuppliers.map((ts: any) => ts.supplierId),
          },
        },
        include: { company: true },
      });

      if (targetSupplierUser) {
        return { order, companyUser: targetSupplierUser, role: 'SUPPLIER' };
      }
    }

    // Check if this is a HYBRID order available to all suppliers
    if (
      order.assignmentType === OrderAssignmentType.HYBRID &&
      !order.supplierId &&
      order.status === OrderStatus.LANCADO_PELA_MARCA
    ) {
      const anySupplierUser = await this.prisma.companyUser.findFirst({
        where: {
          userId,
          company: { type: CompanyType.SUPPLIER },
        },
        include: { company: true },
      });

      if (anySupplierUser) {
        return { order, companyUser: anySupplierUser, role: 'SUPPLIER' };
      }
    }

    throw new ForbiddenException('Você não tem acesso a este pedido');
  }

  // Get order by ID
  async getById(id: string, userId: string) {
    // SECURITY FIX: Verify user has access to this order
    const { order, role } = await this.verifyOrderAccess(id, userId);

    // Financial Privacy Masking for Supplier
    if (role === 'SUPPLIER') {
      let result = {
        ...order,
        totalValue: order.netValue || order.totalValue,
        pricePerUnit: order.netValue
          ? Number(order.netValue) / order.quantity
          : order.pricePerUnit,
        platformFee: undefined,
      };

      if (this.shouldProtectTechSheet(order, true)) {
        result = { ...result, ...this.applyTechSheetProtection(result) };
      }

      return result;
    }

    return order;
  }

  // Accept order (Supplier)
  async accept(orderId: string, userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Only suppliers can accept orders');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { targetSuppliers: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if this supplier can accept
    const canAccept =
      (order.status === OrderStatus.LANCADO_PELA_MARCA &&
        (order.supplierId === companyUser.companyId ||
          order.targetSuppliers.some(
            (t) =>
              t.supplierId === companyUser.companyId &&
              t.status === OrderTargetStatus.PENDING,
          ))) ||
      order.status === OrderStatus.DISPONIVEL_PARA_OUTRAS;

    if (!canAccept) {
      throw new ForbiddenException('You cannot accept this order');
    }

    // Update order
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.ACEITO_PELA_FACCAO,
        supplierId: companyUser.companyId,
        acceptedAt: new Date(),
        acceptedById: userId,
        statusHistory: {
          create: {
            previousStatus: order.status,
            newStatus: OrderStatus.ACEITO_PELA_FACCAO,
            changedById: userId,
            notes: 'Order accepted by supplier',
          },
        },
      },
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
      },
    });

    // If bidding, update target suppliers
    if (order.assignmentType === OrderAssignmentType.BIDDING) {
      await this.prisma.orderTargetSupplier.updateMany({
        where: {
          orderId,
          supplierId: companyUser.companyId,
        },
        data: {
          status: OrderTargetStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      // Reject other suppliers
      await this.prisma.orderTargetSupplier.updateMany({
        where: {
          orderId,
          supplierId: { not: companyUser.companyId },
        },
        data: {
          status: OrderTargetStatus.REJECTED,
          respondedAt: new Date(),
        },
      });
    }

    // Emit order accepted event
    const acceptedEvent: OrderAcceptedEvent = {
      orderId: updated.id,
      displayId: updated.displayId,
      brandId: updated.brandId,
      supplierId: companyUser.companyId,
      supplierName: updated.supplier?.tradeName || 'Facção',
      acceptedById: userId,
    };
    this.eventEmitter.emit(ORDER_ACCEPTED, acceptedEvent);
    this.logger.log(`Emitted order.accepted event for ${updated.displayId}`);

    return updated;
  }

  // Reject order (Supplier)
  async reject(orderId: string, userId: string, reason?: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Only suppliers can reject orders');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { targetSuppliers: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // For DIRECT orders, make available to others
    if (order.assignmentType === OrderAssignmentType.DIRECT) {
      const rejected = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DISPONIVEL_PARA_OUTRAS,
          supplierId: null,
          rejectionReason: reason,
          statusHistory: {
            create: {
              previousStatus: order.status,
              newStatus: OrderStatus.DISPONIVEL_PARA_OUTRAS,
              changedById: userId,
              notes: reason || 'Order rejected by supplier',
            },
          },
        },
      });

      // Emit order rejected event
      const rejectedEvent: OrderRejectedEvent = {
        orderId: rejected.id,
        displayId: rejected.displayId,
        brandId: rejected.brandId,
        supplierId: companyUser.companyId,
        reason,
        rejectedById: userId,
      };
      this.eventEmitter.emit(ORDER_REJECTED, rejectedEvent);
      this.logger.log(`Emitted order.rejected event for ${rejected.displayId}`);

      return rejected;
    }

    // For BIDDING, just update target status
    await this.prisma.orderTargetSupplier.updateMany({
      where: {
        orderId,
        supplierId: companyUser.companyId,
      },
      data: {
        status: OrderTargetStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    // Check if all suppliers rejected
    const pendingTargets = await this.prisma.orderTargetSupplier.count({
      where: {
        orderId,
        status: OrderTargetStatus.PENDING,
      },
    });

    if (pendingTargets === 0) {
      return this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DISPONIVEL_PARA_OUTRAS,
          statusHistory: {
            create: {
              previousStatus: order.status,
              newStatus: OrderStatus.DISPONIVEL_PARA_OUTRAS,
              changedById: userId,
              notes:
                'All targeted suppliers rejected, order available for others',
            },
          },
        },
      });
    }

    return order;
  }

  // Get available transitions for a user on an order
  async getAvailableTransitions(
    orderId: string,
    userId: string,
  ): Promise<TransitionResponse> {
    const { order, role } = await this.verifyOrderAccess(orderId, userId);

    const currentStatus = order.status as string;
    const transitions = this.STATUS_TRANSITIONS[currentStatus] || [];

    // Filter transitions based on user role and materialsProvided
    const available: AvailableTransition[] = transitions
      .filter((t) => {
        if (!t.allowedRoles.includes(role)) return false;
        if (t.requiresMaterials === true && !order.materialsProvided)
          return false;
        if (t.requiresMaterials === false && order.materialsProvided)
          return false;
        return true;
      })
      .map((t) => ({
        nextStatus: t.nextStatus,
        label: t.label,
        description: t.description,
        requiresConfirmation: t.requiresConfirmation,
        requiresNotes: t.requiresNotes,
        requiresReview: t.requiresReview,
      }));

    // Determine waiting state
    const isMyTurn = available.length > 0;

    let waitingFor: 'BRAND' | 'SUPPLIER' | null = null;
    let waitingLabel = '';
    if (!isMyTurn) {
      // Dynamic waiting for ACEITO_PELA_FACCAO based on materialsProvided
      if (currentStatus === OrderStatus.ACEITO_PELA_FACCAO) {
        if (order.materialsProvided) {
          waitingFor = 'BRAND';
          waitingLabel = 'Aguardando a Marca preparar insumos';
        } else {
          waitingFor = 'SUPPLIER';
          waitingLabel = 'Aguardando a Facção iniciar produção';
        }
      } else {
        const waitingInfo = this.WAITING_FOR_MAP[currentStatus];
        if (waitingInfo) {
          waitingFor = waitingInfo.waitingFor;
          waitingLabel = waitingInfo.label;
        }
      }
    }

    return {
      canAdvance: isMyTurn,
      waitingFor,
      waitingLabel,
      transitions: available,
    };
  }

  // Update order status (general status progression) with transition validation
  async updateStatus(
    orderId: string,
    userId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const { order, role } = await this.verifyOrderAccess(orderId, userId);

    // Validate transition
    const currentStatus = order.status as string;
    const allowedTransitions = this.STATUS_TRANSITIONS[currentStatus] || [];

    const matchingTransition = allowedTransitions.find((t) => {
      if (t.nextStatus !== dto.status) return false;
      if (!t.allowedRoles.includes(role)) return false;
      if (t.requiresMaterials === true && !order.materialsProvided)
        return false;
      if (t.requiresMaterials === false && order.materialsProvided)
        return false;
      return true;
    });

    if (!matchingTransition) {
      // Check if the transition exists but user doesn't have permission
      const transitionExists = allowedTransitions.some(
        (t) => t.nextStatus === dto.status,
      );
      if (transitionExists) {
        throw new ForbiddenException(
          `Você não tem permissão para avançar de ${currentStatus} para ${dto.status}`,
        );
      }
      throw new BadRequestException(
        `Transição inválida: ${currentStatus} → ${dto.status}`,
      );
    }

    const changedBy = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.rejectionReason && { rejectionReason: dto.rejectionReason }),
        statusHistory: {
          create: {
            previousStatus: order.status,
            newStatus: dto.status,
            changedById: userId,
            notes: dto.notes,
          },
        },
      },
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    // Emit status changed event
    const statusEvent: OrderStatusChangedEvent = {
      orderId: updated.id,
      displayId: updated.displayId,
      brandId: updated.brandId,
      supplierId: updated.supplierId || undefined,
      previousStatus: order.status,
      newStatus: dto.status,
      changedById: userId,
      changedByName: changedBy?.name || 'Unknown',
    };

    // Use specific event for finalized orders
    if (dto.status === OrderStatus.FINALIZADO) {
      this.eventEmitter.emit(ORDER_FINALIZED, statusEvent);
      this.logger.log(`Emitted order.finalized event for ${updated.displayId}`);
    } else {
      this.eventEmitter.emit(ORDER_STATUS_CHANGED, statusEvent);
      this.logger.log(
        `Emitted order.status.changed event for ${updated.displayId}`,
      );
    }

    return updated;
  }

  // Get all orders (Admin)
  async getAllOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
        parentOrder: { select: { id: true, displayId: true } },
        _count: {
          select: { messages: true, attachments: true, childOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== ORDER REVIEW METHODS ====================

  // Create a new review for an order
  async createReview(orderId: string, userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate quantities
    const totalItems =
      dto.approvedQuantity +
      dto.rejectedQuantity +
      (dto.secondQualityQuantity || 0);
    if (totalItems !== dto.totalQuantity) {
      throw new BadRequestException(
        'Sum of approved, rejected and second quality must equal total quantity',
      );
    }

    // Determine review result
    let result: ReviewResult;
    if (dto.rejectedQuantity === 0 && (dto.secondQualityQuantity || 0) === 0) {
      result = ReviewResult.APPROVED;
    } else if (dto.approvedQuantity === 0) {
      result = ReviewResult.REJECTED;
    } else {
      result = ReviewResult.PARTIAL;
    }

    // Create the review
    const review = await this.prisma.orderReview.create({
      data: {
        orderId,
        type: dto.type,
        result,
        totalQuantity: dto.totalQuantity,
        approvedQuantity: dto.approvedQuantity,
        rejectedQuantity: dto.rejectedQuantity,
        secondQualityQuantity: dto.secondQualityQuantity || 0,
        notes: dto.notes,
        reviewedById: userId,
        rejectedItems: dto.rejectedItems?.length
          ? {
              createMany: {
                data: dto.rejectedItems.map((item) => ({
                  reason: item.reason,
                  quantity: item.quantity,
                  defectDescription: item.defectDescription,
                  requiresRework: item.requiresRework ?? true,
                })),
              },
            }
          : undefined,
      },
      include: {
        rejectedItems: true,
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    // Create second quality items if any
    if (dto.secondQualityItems?.length) {
      await this.prisma.secondQualityItem.createMany({
        data: dto.secondQualityItems.map((item) => ({
          orderId,
          reviewId: review.id,
          quantity: item.quantity,
          defectType: item.defectType,
          defectDescription: item.defectDescription,
          originalUnitValue: order.pricePerUnit,
          discountPercentage: item.discountPercentage || 0,
        })),
      });
    }

    // Update order status based on result
    let newStatus: OrderStatus;
    switch (result) {
      case ReviewResult.APPROVED:
        newStatus = OrderStatus.FINALIZADO;
        break;
      case ReviewResult.PARTIAL:
        newStatus = OrderStatus.PARCIALMENTE_APROVADO;
        break;
      case ReviewResult.REJECTED:
        newStatus = OrderStatus.REPROVADO;
        break;
    }

    // Update order with new status and review metrics
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        totalReviewCount: { increment: 1 },
        approvalCount: dto.approvedQuantity > 0 ? { increment: 1 } : undefined,
        rejectionCount: dto.rejectedQuantity > 0 ? { increment: 1 } : undefined,
        secondQualityCount: { increment: dto.secondQualityQuantity || 0 },
        statusHistory: {
          create: {
            previousStatus: order.status,
            newStatus,
            changedById: userId,
            notes: `Review completed: ${result}`,
          },
        },
      },
    });

    return review;
  }

  // Get all reviews for an order
  async getOrderReviews(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.orderReview.findMany({
      where: { orderId },
      include: {
        rejectedItems: true,
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Create child order for rework
  async createChildOrder(
    parentOrderId: string,
    userId: string,
    dto: CreateChildOrderDto,
  ) {
    const parentOrder = await this.prisma.order.findUnique({
      where: { id: parentOrderId },
      include: {
        childOrders: { select: { revisionNumber: true } },
      },
    });

    if (!parentOrder) {
      throw new NotFoundException('Parent order not found');
    }

    // Calculate next revision number
    const maxRevision = parentOrder.childOrders.reduce(
      (max, child) => Math.max(max, child.revisionNumber),
      parentOrder.revisionNumber,
    );
    const nextRevision = maxRevision + 1;

    // Generate child display ID
    const baseDisplayId = parentOrder.displayId.split('-R')[0]; // Remove any existing -R suffix
    const childDisplayId = this.generateChildDisplayId(
      baseDisplayId,
      nextRevision,
    );

    // Calculate values
    const totalValue = dto.quantity * Number(parentOrder.pricePerUnit);
    const deadline = dto.deliveryDeadline
      ? new Date(dto.deliveryDeadline)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // Default: 14 days

    // Create child order
    const childOrder = await this.prisma.order.create({
      data: {
        displayId: childDisplayId,
        brandId: parentOrder.brandId,
        supplierId: parentOrder.supplierId,
        status: OrderStatus.AGUARDANDO_RETRABALHO,
        assignmentType: parentOrder.assignmentType,
        parentOrderId: parentOrderId,
        revisionNumber: nextRevision,
        origin: OrderOrigin.REWORK,
        productType: parentOrder.productType,
        productCategory: parentOrder.productCategory,
        productName: parentOrder.productName,
        description:
          dto.description || `Retrabalho do pedido ${parentOrder.displayId}`,
        quantity: dto.quantity,
        pricePerUnit: 0, // Rework is at no additional cost to the brand
        totalValue: 0,
        deliveryDeadline: deadline,
        paymentTerms: 'Sem custo adicional - Retrabalho',
        materialsProvided: parentOrder.materialsProvided,
        observations: dto.observations,
        statusHistory: {
          create: {
            newStatus: OrderStatus.AGUARDANDO_RETRABALHO,
            changedById: userId,
            notes: `Child order created for rework of ${parentOrder.displayId}`,
          },
        },
      },
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
        parentOrder: { select: { id: true, displayId: true } },
      },
    });

    // Update parent order status
    await this.prisma.order.update({
      where: { id: parentOrderId },
      data: {
        status: OrderStatus.AGUARDANDO_RETRABALHO,
        statusHistory: {
          create: {
            previousStatus: parentOrder.status,
            newStatus: OrderStatus.AGUARDANDO_RETRABALHO,
            changedById: userId,
            notes: `Child order ${childDisplayId} created for rework`,
          },
        },
      },
    });

    return childOrder;
  }

  // Get order hierarchy (parent + all children)
  async getOrderHierarchy(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
        parentOrder: {
          select: {
            id: true,
            displayId: true,
            status: true,
            quantity: true,
            revisionNumber: true,
          },
        },
        childOrders: {
          select: {
            id: true,
            displayId: true,
            status: true,
            quantity: true,
            revisionNumber: true,
            origin: true,
            createdAt: true,
          },
          orderBy: { revisionNumber: 'asc' },
        },
        reviews: {
          include: {
            rejectedItems: true,
            reviewedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        secondQualityItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // If this is a child order, get the root parent
    let rootOrder: any = order;
    if (order.parentOrder) {
      const parent = await this.prisma.order.findUnique({
        where: { id: order.parentOrder.id },
        include: {
          childOrders: {
            select: {
              id: true,
              displayId: true,
              status: true,
              quantity: true,
              revisionNumber: true,
              origin: true,
              createdAt: true,
            },
            orderBy: { revisionNumber: 'asc' },
          },
        },
      });
      if (parent) {
        rootOrder = parent;
      }
    }

    return {
      currentOrder: order,
      rootOrder: rootOrder.id !== order.id ? rootOrder : null,
      hierarchy: {
        parent: order.parentOrder,
        children: order.childOrders,
      },
    };
  }

  // Add second quality items to an order
  async addSecondQualityItems(
    orderId: string,
    userId: string,
    items: {
      quantity: number;
      defectType: string;
      defectDescription?: string;
      discountPercentage?: number;
    }[],
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const createdItems = await this.prisma.secondQualityItem.createMany({
      data: items.map((item) => ({
        orderId,
        quantity: item.quantity,
        defectType: item.defectType,
        defectDescription: item.defectDescription,
        originalUnitValue: order.pricePerUnit,
        discountPercentage: item.discountPercentage || 0,
      })),
    });

    // Update order second quality count
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    await this.prisma.order.update({
      where: { id: orderId },
      data: { secondQualityCount: { increment: totalQty } },
    });

    return createdItems;
  }

  // Get second quality items for an order
  async getSecondQualityItems(orderId: string) {
    return this.prisma.secondQualityItem.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get review statistics for reporting
  async getReviewStats(companyId?: string) {
    const whereClause = companyId ? { brandId: companyId } : {};

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        totalReviewCount: true,
        approvalCount: true,
        rejectionCount: true,
        secondQualityCount: true,
        quantity: true,
        reviews: {
          select: {
            result: true,
            approvedQuantity: true,
            rejectedQuantity: true,
            secondQualityQuantity: true,
          },
        },
        childOrders: { select: { id: true } },
      },
    });

    const totalOrders = orders.length;
    const ordersWithReviews = orders.filter(
      (o) => o.totalReviewCount > 0,
    ).length;
    const ordersWithRework = orders.filter(
      (o) => o.childOrders.length > 0,
    ).length;
    const totalSecondQuality = orders.reduce(
      (sum, o) => sum + o.secondQualityCount,
      0,
    );

    // Calculate approval rate
    const reviewedOrders = orders.filter((o) => o.reviews.length > 0);
    const approvedFirstTime = reviewedOrders.filter(
      (o) => o.reviews.length === 1 && o.reviews[0].result === 'APPROVED',
    ).length;
    const firstTimeApprovalRate =
      reviewedOrders.length > 0
        ? (approvedFirstTime / reviewedOrders.length) * 100
        : 0;

    return {
      totalOrders,
      ordersWithReviews,
      ordersWithRework,
      totalSecondQuality,
      firstTimeApprovalRate: Math.round(firstTimeApprovalRate * 10) / 10,
      reworkRate:
        totalOrders > 0
          ? Math.round((ordersWithRework / totalOrders) * 1000) / 10
          : 0,
    };
  }

  /**
   * Get monthly statistics for orders
   * Used by brand dashboard to show real chart data
   */
  async getMonthlyStats(userId: string, role: 'BRAND' | 'SUPPLIER', months = 6) {
    // Get company for this user
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: {
          type: role === 'BRAND' ? CompanyType.BRAND : CompanyType.SUPPLIER,
        },
      },
      include: { company: true },
    });

    if (!companyUser) {
      throw new NotFoundException('Company not found');
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const companyFilter =
      role === 'BRAND'
        ? { brandId: companyUser.companyId }
        : { supplierId: companyUser.companyId };

    // Get all orders in the period
    const orders = await this.prisma.order.findMany({
      where: {
        ...companyFilter,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        totalValue: true,
        status: true,
      },
    });

    // Group by month
    const monthlyMap = new Map<string, { total: number; value: number; completed: number }>();
    orders.forEach((order) => {
      const monthKey = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`;
      const existing = monthlyMap.get(monthKey) || { total: 0, value: 0, completed: 0 };
      existing.total++;
      existing.value += Number(order.totalValue) || 0;
      if (order.status === OrderStatus.FINALIZADO) {
        existing.completed++;
      }
      monthlyMap.set(monthKey, existing);
    });

    // Get status breakdown
    const statusBreakdown = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        ...companyFilter,
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: { totalValue: true },
    });

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    const statusNames: Record<string, string> = {
      FINALIZADO: 'Concluído',
      EM_PRODUCAO: 'Em Produção',
      ACEITO_PELA_FACCAO: 'Aceito',
      LANCADO_PELA_MARCA: 'Aguardando',
      RECUSADO_PELA_FACCAO: 'Recusado',
      PRONTO: 'Pronto',
      EM_TRANSITO_PARA_MARCA: 'Em Trânsito',
    };

    // Convert map to sorted array
    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          month: monthNames[month],
          name: monthNames[month],
          ...data,
        };
      });

    return {
      monthly: monthlyData,
      byStatus: statusBreakdown.map((s) => ({
        status: statusNames[s.status] || s.status,
        name: statusNames[s.status] || s.status,
        count: s._count,
        value: Number(s._sum.totalValue) || 0,
      })),
    };
  }
}
