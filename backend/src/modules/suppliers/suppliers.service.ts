import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OnboardingPhase2Dto,
  OnboardingPhase3Dto,
  SupplierFilterDto,
} from './dto';
import { CompanyType, CompanyStatus, OrderStatus, OrderTargetStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { InvitationNotificationService } from './services/invitation-notification.service';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private invitationNotificationService: InvitationNotificationService,
  ) { }

  // Get supplier profile for current user
  async getMyProfile(userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
      include: {
        company: {
          include: {
            supplierProfile: true,
            documents: true,
          },
        },
      },
    });

    if (!companyUser) {
      throw new NotFoundException('Supplier profile not found');
    }

    return companyUser.company;
  }

  // Phase 2: Update business qualification
  async updatePhase2(userId: string, dto: OnboardingPhase2Dto) {
    const company = await this.getMyProfile(userId);

    if (!company.supplierProfile) {
      throw new NotFoundException('Supplier profile not found');
    }

    return this.prisma.supplierProfile.update({
      where: { id: company.supplierProfile.id },
      data: {
        onboardingPhase: 2,
        businessQualification: dto as unknown as Prisma.JsonObject,
      },
    });
  }

  // Phase 3: Update production capacity
  async updatePhase3(userId: string, dto: OnboardingPhase3Dto) {
    const company = await this.getMyProfile(userId);

    if (!company.supplierProfile) {
      throw new NotFoundException('Supplier profile not found');
    }

    return this.prisma.supplierProfile.update({
      where: { id: company.supplierProfile.id },
      data: {
        onboardingPhase: 3,
        productTypes: dto.productTypes,
        specialties: dto.specialties || [],
        monthlyCapacity: dto.monthlyCapacity,
        currentOccupancy: dto.currentOccupancy || 0,
        onboardingComplete: dto.onboardingComplete ?? true,
      },
    });
  }

  // Mark onboarding as complete (for existing users)
  async completeOnboarding(userId: string) {
    const company = await this.getMyProfile(userId);

    if (!company.supplierProfile) {
      throw new NotFoundException('Supplier profile not found');
    }

    return this.prisma.supplierProfile.update({
      where: { id: company.supplierProfile.id },
      data: {
        onboardingPhase: 3,
        onboardingComplete: true,
      },
    });
  }

  // Get unified report data for supplier
  async getReports(userId: string, startDate?: Date, endDate?: Date) {
    const company = await this.getMyProfile(userId);

    const start =
      startDate ||
      new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1);
    const end = endDate || new Date();

    const dateFilter = {
      gte: start,
      lte: end,
    };

    // Get all orders in the period
    const [
      allOrders,
      acceptedOrders,
      rejectedOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      avgRating,
    ] = await Promise.all([
      // All orders
      this.prisma.order.count({
        where: { supplierId: company.id, createdAt: dateFilter },
      }),
      // Accepted orders
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          createdAt: dateFilter,
          status: {
            notIn: [
              OrderStatus.LANCADO_PELA_MARCA,
              OrderStatus.RECUSADO_PELA_FACCAO,
            ],
          },
        },
      }),
      // Rejected by supplier
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          createdAt: dateFilter,
          status: OrderStatus.RECUSADO_PELA_FACCAO,
        },
      }),
      // Completed orders
      this.prisma.order.count({
        where: {
          supplierId: company.id,
          createdAt: dateFilter,
          status: OrderStatus.FINALIZADO,
        },
      }),
      // Cancelled orders with details
      this.prisma.order.findMany({
        where: {
          supplierId: company.id,
          createdAt: dateFilter,
          status: OrderStatus.RECUSADO_PELA_FACCAO,
        },
        select: {
          id: true,
          displayId: true,
          createdAt: true,
          totalValue: true,
          rejectionReason: true,
          brand: { select: { tradeName: true } },
        },
      }),
      // Total revenue
      this.prisma.order.aggregate({
        where: {
          supplierId: company.id,
          createdAt: dateFilter,
          status: OrderStatus.FINALIZADO,
        },
        _sum: { totalValue: true },
      }),
      // Average rating
      this.prisma.rating.aggregate({
        where: {
          toCompanyId: company.id,
          createdAt: dateFilter,
        },
        _avg: { score: true },
      }),
    ]);

    // Group cancellations by reason
    const cancellationsByReason = cancelledOrders.reduce(
      (acc, order) => {
        const reason = order.rejectionReason || 'Sem motivo informado';
        if (!acc[reason]) {
          acc[reason] = { count: 0, value: 0 };
        }
        acc[reason].count++;
        acc[reason].value += Number(order.totalValue) || 0;
        return acc;
      },
      {} as Record<string, { count: number; value: number }>,
    );

    const totalCancellationValue = cancelledOrders.reduce(
      (sum, o) => sum + (Number(o.totalValue) || 0),
      0,
    );
    const revenue = Number(totalRevenue._sum.totalValue) || 0;

    return {
      period: { start, end },
      summary: {
        totalOrders: allOrders,
        totalRevenue: revenue,
        avgTicket:
          acceptedOrders > 0 ? Math.round(revenue / acceptedOrders) : 0,
        avgRating: avgRating._avg.score || company.avgRating || 0,
      },
      sales: {
        accepted: acceptedOrders,
        rejected: rejectedOrders,
        completed: completedOrders,
        acceptanceRate:
          allOrders > 0 ? Math.round((acceptedOrders / allOrders) * 100) : 0,
      },
      cancellations: {
        total: cancelledOrders.length,
        totalLoss: totalCancellationValue,
        percentage:
          allOrders > 0
            ? ((cancelledOrders.length / allOrders) * 100).toFixed(1)
            : '0',
        byReason: Object.entries(cancellationsByReason).map(
          ([reason, data]) => ({
            reason,
            count: data.count,
            value: data.value,
            percentage:
              cancelledOrders.length > 0
                ? Math.round((data.count / cancelledOrders.length) * 100)
                : 0,
          }),
        ),
        recent: cancelledOrders.slice(0, 5).map((o) => ({
          id: o.id,
          code: o.displayId,
          date: o.createdAt,
          brand: o.brand?.tradeName || 'N/A',
          reason: o.rejectionReason || 'Sem motivo',
          value: Number(o.totalValue) || 0,
        })),
      },
      quality: {
        avgRating: avgRating._avg.score || company.avgRating || 0,
        completionRate:
          acceptedOrders > 0
            ? Math.round((completedOrders / acceptedOrders) * 100)
            : 0,
      },
    };
  }

  // Get dashboard data for supplier
  async getDashboard(userId: string) {
    const company = await this.getMyProfile(userId);

    // Get order statistics
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const activeStatuses = [
      OrderStatus.ACEITO_PELA_FACCAO,
      OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
      OrderStatus.EM_TRANSITO_PARA_FACCAO,
      OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO,
      OrderStatus.EM_PRODUCAO,
    ];

    const [pendingOrders, activeOrders, completedOrders, totalRevenue, activeOrdersForCapacity] =
      await Promise.all([
        // Pending orders (waiting for acceptance)
        this.prisma.order.count({
          where: {
            supplierId: company.id,
            status: OrderStatus.LANCADO_PELA_MARCA,
          },
        }),
        // Active orders (in production)
        this.prisma.order.count({
          where: {
            supplierId: company.id,
            status: { in: activeStatuses },
          },
        }),
        // Completed this month
        this.prisma.order.count({
          where: {
            supplierId: company.id,
            status: OrderStatus.FINALIZADO,
            updatedAt: { gte: monthStart },
          },
        }),
        // Total revenue from completed orders
        this.prisma.order.aggregate({
          where: {
            supplierId: company.id,
            status: OrderStatus.FINALIZADO,
          },
          _sum: { totalValue: true },
        }),
        // All active orders for capacity calculation (with AND without planned dates)
        this.prisma.order.findMany({
          where: {
            supplierId: company.id,
            status: { in: activeStatuses },
          },
          select: {
            quantity: true,
            totalProductionMinutes: true,
            plannedStartDate: true,
            plannedEndDate: true,
          },
        }),
      ]);

    // Calculate real capacity usage for the current month
    const monthlyCapacity = company.supplierProfile?.monthlyCapacity || 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const DEFAULT_MINUTES_PER_PIECE = 15;
    let capacityUsage = 0;

    if (monthlyCapacity > 0 && activeOrdersForCapacity.length > 0) {
      let totalAllocatedMinutes = 0;
      for (const order of activeOrdersForCapacity) {
        const productionMinutes = order.totalProductionMinutes
          || Math.round(order.quantity * DEFAULT_MINUTES_PER_PIECE);

        if (order.plannedStartDate && order.plannedEndDate) {
          // Has planned dates — calculate overlap with current month
          const orderStart = order.plannedStartDate;
          const orderEnd = order.plannedEndDate;
          if (orderStart > monthEnd || orderEnd < monthStart) continue;
          const totalDays = Math.max(1, Math.ceil((orderEnd.getTime() - orderStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          const dailyMinutes = productionMinutes / totalDays;

          const overlapStart = orderStart > monthStart ? orderStart : monthStart;
          const overlapEnd = orderEnd < monthEnd ? orderEnd : monthEnd;
          const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          totalAllocatedMinutes += dailyMinutes * overlapDays;
        } else {
          // No planned dates — assume it spans the entire current month
          totalAllocatedMinutes += productionMinutes;
        }
      }
      capacityUsage = Math.min(100, Math.round((totalAllocatedMinutes / monthlyCapacity) * 100));
    }

    return {
      company: {
        id: company.id,
        tradeName: company.tradeName,
        avgRating: company.avgRating,
        status: company.status,
      },
      profile: company.supplierProfile,
      stats: {
        pendingOrders,
        activeOrders,
        completedOrdersThisMonth: completedOrders,
        totalRevenue: totalRevenue._sum.totalValue || 0,
        capacityUsage,
      },
    };
  }

  // Get available opportunities (orders waiting for acceptance)
  async getOpportunities(
    userId: string,
    filters?: {
      search?: string;
      category?: string;
      minValue?: number;
      maxValue?: number;
      deadlineFrom?: string;
      deadlineTo?: string;
      sort?: string;
    },
  ) {
    const company = await this.getMyProfile(userId);

    // Build additional filters
    const additionalWhere: Prisma.OrderWhereInput = {};

    if (filters?.search) {
      const searchTerm = filters.search;
      additionalWhere.OR = [
        { productName: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { productCategory: { contains: searchTerm, mode: 'insensitive' } },
        { productType: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { tradeName: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    if (filters?.category) {
      additionalWhere.productCategory = { contains: filters.category, mode: 'insensitive' };
    }

    if (filters?.minValue !== undefined || filters?.maxValue !== undefined) {
      additionalWhere.totalValue = {};
      if (filters?.minValue !== undefined) {
        additionalWhere.totalValue.gte = filters.minValue;
      }
      if (filters?.maxValue !== undefined) {
        additionalWhere.totalValue.lte = filters.maxValue;
      }
    }

    if (filters?.deadlineFrom || filters?.deadlineTo) {
      additionalWhere.deliveryDeadline = {};
      if (filters?.deadlineFrom) {
        additionalWhere.deliveryDeadline.gte = new Date(filters.deadlineFrom);
      }
      if (filters?.deadlineTo) {
        additionalWhere.deliveryDeadline.lte = new Date(filters.deadlineTo);
      }
    }

    // Determine sort order
    let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters?.sort === 'highest_value') {
      orderBy = { totalValue: 'desc' };
    } else if (filters?.sort === 'closest_deadline') {
      orderBy = { deliveryDeadline: 'asc' };
    }
    // 'newest' is default (createdAt desc)

    return this.prisma.order.findMany({
      where: {
        AND: [
          {
            OR: [
              // Direct orders to this supplier
              {
                supplierId: company.id,
                status: OrderStatus.LANCADO_PELA_MARCA,
              },
              // Bidding orders where this supplier is targeted
              {
                targetSuppliers: {
                  some: {
                    supplierId: company.id,
                    status: 'PENDING',
                  },
                },
                status: OrderStatus.LANCADO_PELA_MARCA,
              },
              // Orders available to all (after rejection), excluding those this supplier already rejected
              {
                status: OrderStatus.DISPONIVEL_PARA_OUTRAS,
                NOT: {
                  targetSuppliers: {
                    some: {
                      supplierId: company.id,
                      status: OrderTargetStatus.REJECTED,
                    },
                  },
                },
              },
            ],
          },
          additionalWhere,
        ],
      },
      include: {
        brand: {
          select: {
            id: true,
            tradeName: true,
            avgRating: true,
            city: true,
            state: true,
          },
        },
        attachments: true,
        targetSuppliers: {
          where: { supplierId: company.id },
          select: { id: true, status: true, message: true },
        },
      },
      orderBy,
    });
  }

  // Express interest in a BIDDING/HYBRID order
  async expressInterest(userId: string, orderId: string, message?: string) {
    const company = await this.getMyProfile(userId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        targetSuppliers: {
          where: { supplierId: company.id },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.status !== OrderStatus.LANCADO_PELA_MARCA && order.status !== OrderStatus.DISPONIVEL_PARA_OUTRAS) {
      throw new ForbiddenException('Este pedido não está disponível para demonstrar interesse');
    }

    if (order.assignmentType === 'DIRECT') {
      throw new ForbiddenException('Pedidos diretos não aceitam demonstração de interesse. Use a ação "Aceitar Pedido".');
    }

    // Check if already has a target record
    const existingTarget = order.targetSuppliers[0];

    if (existingTarget) {
      if (existingTarget.status === OrderTargetStatus.INTERESTED) {
        throw new ForbiddenException('Você já demonstrou interesse neste pedido');
      }
      if (existingTarget.status === OrderTargetStatus.ACCEPTED) {
        throw new ForbiddenException('Você já foi aceito neste pedido');
      }

      // Update existing PENDING target to INTERESTED
      await this.prisma.orderTargetSupplier.update({
        where: { id: existingTarget.id },
        data: {
          status: OrderTargetStatus.INTERESTED,
          message: message || null,
          respondedAt: new Date(),
        },
      });
    } else {
      // Create new target record with INTERESTED status (for DISPONIVEL_PARA_OUTRAS)
      await this.prisma.orderTargetSupplier.create({
        data: {
          orderId,
          supplierId: company.id,
          status: OrderTargetStatus.INTERESTED,
          message: message || null,
          respondedAt: new Date(),
        },
      });
    }

    // Emit event to notify the brand
    this.eventEmitter.emit('supplier.interest.expressed', {
      orderId,
      orderDisplayId: order.displayId,
      brandId: order.brandId,
      supplierId: company.id,
      supplierName: company.tradeName || company.legalName || 'Facção',
      message: message || undefined,
    });
    this.logger.log(`Emitted supplier.interest.expressed for order ${order.displayId}`);

    return {
      success: true,
      message: 'Interesse demonstrado com sucesso. A marca será notificada.',
    };
  }

  // Search suppliers (for brands and admins)
  async search(filters: SupplierFilterDto) {
    const where: Prisma.CompanyWhereInput = {
      type: CompanyType.SUPPLIER,
      status: CompanyStatus.ACTIVE,
      supplierProfile: {
        onboardingComplete: true,
      },
    };

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.state) {
      where.state = filters.state;
    }

    if (filters.minRating) {
      where.avgRating = { gte: filters.minRating };
    }

    if (filters.productTypes?.length) {
      where.supplierProfile = {
        ...(where.supplierProfile as object),
        productTypes: { hasSome: filters.productTypes },
      };
    }

    if (filters.specialties?.length) {
      where.supplierProfile = {
        ...(where.supplierProfile as object),
        specialties: { hasSome: filters.specialties },
      };
    }

    if (filters.minCapacity || filters.maxCapacity) {
      where.supplierProfile = {
        ...(where.supplierProfile as object),
        monthlyCapacity: {
          ...(filters.minCapacity && { gte: filters.minCapacity }),
          ...(filters.maxCapacity && { lte: filters.maxCapacity }),
        },
      };
    }

    return this.prisma.company.findMany({
      where,
      include: {
        supplierProfile: true,
        _count: {
          select: { ordersAsSupplier: true },
        },
      },
      orderBy: { avgRating: 'desc' },
    });
  }

  // Get supplier by ID (public profile)
  async getById(id: string) {
    const supplier = await this.prisma.company.findFirst({
      where: {
        id,
        type: CompanyType.SUPPLIER,
      },
      include: {
        supplierProfile: true,
        documents: {
          where: {
            type: { in: ['FOTO_OPERACAO', 'FOTO_PRODUTO', 'CERTIFICACAO'] },
          },
        },
        ratingsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            fromCompany: {
              select: { tradeName: true },
            },
          },
        },
        _count: {
          select: { ordersAsSupplier: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  // ==================== INVITATION METHODS ====================

  /**
   * Validate CNPJ using Brasil API
   */
  async validateCnpj(cnpj: string) {
    // Clean CNPJ (remove non-numeric characters)
    const cleanedCnpj = cnpj.replace(/\D/g, '');

    if (cleanedCnpj.length !== 14) {
      return {
        isValid: false,
        error: 'CNPJ deve conter 14 dígitos',
        source: 'LOCAL',
        timestamp: new Date(),
      };
    }

    try {
      // Use Brasil API directly (free, no auth required)
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            isValid: false,
            error: 'CNPJ não encontrado na Receita Federal',
            source: 'BRASIL_API',
            timestamp: new Date(),
          };
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Parse and return normalised data
      return {
        isValid: true,
        data: {
          cnpj: this.formatCnpj(cleanedCnpj),
          razaoSocial: data.razao_social,
          nomeFantasia: data.nome_fantasia,
          situacao: data.descricao_situacao_cadastral,
          dataSituacao: data.data_situacao_cadastral,
          dataAbertura: data.data_inicio_atividade,
          naturezaJuridica: data.natureza_juridica,
          capitalSocial: data.capital_social,
          porte: data.porte,
          endereco: {
            logradouro: `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro || ''}`.trim(),
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            municipio: data.municipio,
            uf: data.uf,
            cep: data.cep,
          },
          atividadePrincipal: data.cnae_fiscal_descricao
            ? {
              codigo: String(data.cnae_fiscal),
              descricao: data.cnae_fiscal_descricao,
            }
            : null,
          telefone: data.ddd_telefone_1,
          email: data.email,
        },
        source: 'BRASIL_API',
        timestamp: new Date(),
        rawResponse: data,
      };
    } catch (error) {
      console.error('CNPJ validation error:', error);
      return {
        isValid: false,
        error: 'Erro ao consultar CNPJ. Tente novamente.',
        source: 'BRASIL_API',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Invite a new supplier (create credential + send invitation)
   */
  async inviteSupplier(
    dto: {
      cnpj: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      contactWhatsapp?: string;
      customMessage?: string;
      sendVia: 'EMAIL' | 'WHATSAPP' | 'BOTH';
      internalCode?: string;
      notes?: string;
    },
    user: { id: string; companyId: string },
  ) {
    const brandId = user.companyId;
    const cleanedCnpj = dto.cnpj.replace(/\D/g, '');

    // Check if already invited by this brand
    const existing = await this.prisma.supplierCredential.findFirst({
      where: {
        brandId,
        cnpj: cleanedCnpj,
      },
    });

    if (existing) {
      throw new ForbiddenException(
        'Esta facção já foi convidada. Verifique a lista de convites.',
      );
    }

    // Validate CNPJ
    const validation = await this.validateCnpj(cleanedCnpj);

    // Create supplier credential
    const credential = await this.prisma.supplierCredential.create({
      data: {
        brandId,
        createdById: user.id,
        cnpj: cleanedCnpj,
        legalName: validation.isValid ? validation.data?.razaoSocial : undefined,
        tradeName: validation.isValid ? validation.data?.nomeFantasia : undefined,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone.replace(/\D/g, ''),
        contactWhatsapp: dto.contactWhatsapp?.replace(/\D/g, ''),
        internalCode: dto.internalCode,
        notes: dto.notes,
        status: 'INVITATION_PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        // Store address if validated
        ...(validation.isValid &&
          validation.data?.endereco && {
          addressStreet: validation.data.endereco.logradouro,
          addressNumber: validation.data.endereco.numero,
          addressComplement: validation.data.endereco.complemento,
          addressNeighborhood: validation.data.endereco.bairro,
          addressCity: validation.data.endereco.municipio,
          addressState: validation.data.endereco.uf,
          addressZipCode: validation.data.endereco.cep,
        }),
      },
    });

    // Create status history
    await this.prisma.credentialStatusHistory.create({
      data: {
        credentialId: credential.id,
        fromStatus: null,
        toStatus: 'INVITATION_PENDING',
        performedById: user.id,
        reason: 'Convite criado pela marca',
      },
    });

    // Create invitation record(s)
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (dto.sendVia === 'EMAIL' || dto.sendVia === 'BOTH') {
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: 'EMAIL',
          recipient: dto.contactEmail,
          token: invitationToken,
          subject: 'Convite para fazer parte da rede TexLink',
          message: dto.customMessage,
          expiresAt,
          sentAt: new Date(),
          attemptCount: 1,
          lastAttemptAt: new Date(),
        },
      });
    }

    if (dto.sendVia === 'WHATSAPP' || dto.sendVia === 'BOTH') {
      const whatsappToken =
        dto.sendVia === 'BOTH' ? crypto.randomUUID() : invitationToken;
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: 'WHATSAPP',
          recipient: dto.contactWhatsapp || dto.contactPhone,
          token: whatsappToken,
          message: dto.customMessage,
          expiresAt,
          sentAt: new Date(),
          attemptCount: 1,
          lastAttemptAt: new Date(),
        },
      });
    }

    // Update status to INVITATION_SENT
    await this.prisma.supplierCredential.update({
      where: { id: credential.id },
      data: { status: 'INVITATION_SENT' },
    });

    await this.prisma.credentialStatusHistory.create({
      data: {
        credentialId: credential.id,
        fromStatus: 'INVITATION_PENDING',
        toStatus: 'INVITATION_SENT',
        performedById: user.id,
        reason: `Convite enviado via ${dto.sendVia}`,
      },
    });

    // Get brand name for notification
    const brand = await this.prisma.company.findUnique({
      where: { id: brandId },
      select: { tradeName: true, legalName: true },
    });
    const brandName = brand?.tradeName || brand?.legalName || 'Marca';

    // Send actual notifications
    const notificationResult = await this.invitationNotificationService.sendInvitation(
      {
        supplierLegalName: credential.legalName || 'Fornecedor',
        supplierTradeName: credential.tradeName || undefined,
        supplierCnpj: cleanedCnpj,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactWhatsapp || dto.contactPhone,
        brandName,
        invitationToken,
        expiresAt,
        customMessage: dto.customMessage,
      },
      {
        email: dto.sendVia === 'EMAIL' || dto.sendVia === 'BOTH',
        whatsapp: dto.sendVia === 'WHATSAPP' || dto.sendVia === 'BOTH',
      },
    );

    // Build message based on what was sent
    const sentChannels: string[] = [];
    if (notificationResult.emailSent) sentChannels.push('email');
    if (notificationResult.whatsappSent) sentChannels.push('WhatsApp');
    const channelsMessage = sentChannels.length > 0
      ? `Convite enviado com sucesso via ${sentChannels.join(' e ')}`
      : 'Convite criado (notificações não enviadas - verifique configurações)';

    return {
      id: credential.id,
      cnpj: this.formatCnpj(cleanedCnpj),
      legalName: credential.legalName,
      status: 'INVITATION_SENT',
      message: channelsMessage,
      expiresAt,
      notificationResult,
    };
  }

  /**
   * Get all invitations for a brand
   */
  async getInvitations(brandId: string) {
    const credentials = await this.prisma.supplierCredential.findMany({
      where: {
        brandId,
        status: {
          in: [
            'INVITATION_PENDING',
            'INVITATION_SENT',
            'INVITATION_OPENED',
            'INVITATION_EXPIRED',
            'ONBOARDING_STARTED',
            'ONBOARDING_IN_PROGRESS',
            'CONTRACT_PENDING',
            'CONTRACT_SIGNED',
            'ACTIVE',
          ],
        },
      },
      include: {
        invitations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return credentials.map((cred) => {
      const lastInvitation = cred.invitations[0];
      const isExpired =
        cred.expiresAt && new Date(cred.expiresAt) < new Date();

      return {
        id: cred.id,
        cnpj: this.formatCnpj(cred.cnpj),
        legalName: cred.legalName,
        tradeName: cred.tradeName,
        contactName: cred.contactName,
        contactEmail: cred.contactEmail,
        contactPhone: cred.contactPhone,
        contactWhatsapp: cred.contactWhatsapp,
        status: isExpired ? 'INVITATION_EXPIRED' : cred.status,
        internalCode: cred.internalCode,
        createdAt: cred.createdAt,
        expiresAt: cred.expiresAt,
        lastInvitationSentAt: lastInvitation?.sentAt,
        canResend:
          isExpired ||
          cred.status === 'INVITATION_PENDING' ||
          cred.status === 'INVITATION_SENT',
      };
    });
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(
    credentialId: string,
    user: { id: string; companyId: string },
    options?: { sendVia?: 'EMAIL' | 'WHATSAPP' | 'BOTH'; customMessage?: string },
  ) {
    const credential = await this.prisma.supplierCredential.findFirst({
      where: {
        id: credentialId,
        brandId: user.companyId,
      },
    });

    if (!credential) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (
      credential.status === 'ACTIVE' ||
      credential.status === 'CONTRACT_SIGNED'
    ) {
      throw new ForbiddenException(
        'Não é possível reenviar convite para facção já ativa',
      );
    }

    // Create new invitation
    const newToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sendVia = options?.sendVia || 'EMAIL';

    if (sendVia === 'EMAIL' || sendVia === 'BOTH') {
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: 'EMAIL',
          recipient: credential.contactEmail!,
          token: newToken,
          subject: 'Lembrete: Convite para fazer parte da rede TexLink',
          message: options?.customMessage,
          expiresAt,
          sentAt: new Date(),
          attemptCount: 1,
          lastAttemptAt: new Date(),
        },
      });
    }

    if (sendVia === 'WHATSAPP' || sendVia === 'BOTH') {
      await this.prisma.credentialInvitation.create({
        data: {
          credentialId: credential.id,
          type: 'WHATSAPP',
          recipient: credential.contactWhatsapp || credential.contactPhone!,
          token: sendVia === 'BOTH' ? crypto.randomUUID() : newToken,
          message: options?.customMessage,
          expiresAt,
          sentAt: new Date(),
          attemptCount: 1,
          lastAttemptAt: new Date(),
        },
      });
    }

    // Update expiry
    await this.prisma.supplierCredential.update({
      where: { id: credential.id },
      data: {
        status: 'INVITATION_SENT',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.credentialStatusHistory.create({
      data: {
        credentialId: credential.id,
        fromStatus: credential.status,
        toStatus: 'INVITATION_SENT',
        performedById: user.id,
        reason: `Convite reenviado via ${sendVia}`,
      },
    });

    // Get brand name for notification
    const brand = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { tradeName: true, legalName: true },
    });
    const brandName = brand?.tradeName || brand?.legalName || 'Marca';

    // Send actual notifications
    const notificationResult = await this.invitationNotificationService.sendInvitation(
      {
        supplierLegalName: credential.legalName || 'Fornecedor',
        supplierTradeName: credential.tradeName || undefined,
        supplierCnpj: credential.cnpj,
        contactName: credential.contactName || 'Responsável',
        contactEmail: credential.contactEmail || undefined,
        contactPhone: credential.contactWhatsapp || credential.contactPhone || undefined,
        brandName,
        invitationToken: newToken,
        expiresAt,
        customMessage: options?.customMessage,
      },
      {
        email: sendVia === 'EMAIL' || sendVia === 'BOTH',
        whatsapp: sendVia === 'WHATSAPP' || sendVia === 'BOTH',
      },
    );

    // Build response message
    const sentChannels: string[] = [];
    if (notificationResult.emailSent) sentChannels.push('email');
    if (notificationResult.whatsappSent) sentChannels.push('WhatsApp');

    return {
      success: true,
      message: sentChannels.length > 0
        ? `Convite reenviado com sucesso via ${sentChannels.join(' e ')}`
        : 'Convite recriado (notificações não enviadas)',
      notificationResult,
    };
  }
  /**
   * Get invitation details by token (public - for acceptance page)
   */
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.credentialInvitation.findFirst({
      where: {
        token,
      },
      include: {
        credential: {
          include: {
            brand: {
              select: { id: true, tradeName: true, legalName: true, logoUrl: true },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    const isExpired = new Date(invitation.expiresAt) < new Date();
    const isUsed = !invitation.isActive || invitation.response !== null;

    return {
      id: invitation.id,
      status: isUsed
        ? invitation.response === 'ACCEPTED'
          ? 'ACCEPTED'
          : 'USED'
        : isExpired
          ? 'EXPIRED'
          : 'VALID',
      brand: {
        name: invitation.credential.brand.tradeName || invitation.credential.brand.legalName,
        logoUrl: invitation.credential.brand.logoUrl,
      },
      supplier: {
        legalName: invitation.credential.legalName,
        tradeName: invitation.credential.tradeName,
        cnpj: this.formatCnpj(invitation.credential.cnpj),
        contactName: invitation.credential.contactName,
        contactEmail: invitation.credential.contactEmail,
      },
      expiresAt: invitation.expiresAt,
      isExpired,
      isUsed,
    };
  }

  /**
   * Accept an invitation (public - called by supplier)
   */
  async acceptInvitation(token: string) {
    const invitation = await this.prisma.credentialInvitation.findFirst({
      where: {
        token,
        isActive: true,
      },
      include: {
        credential: {
          include: {
            brand: {
              select: { id: true, tradeName: true, legalName: true },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado ou já utilizado');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      // Mark as expired
      await this.prisma.credentialInvitation.update({
        where: { id: invitation.id },
        data: { isActive: false, response: 'EXPIRED' },
      });
      throw new ForbiddenException(
        'Este convite expirou. Solicite um novo convite à marca.',
      );
    }

    // Mark invitation as responded
    await this.prisma.credentialInvitation.update({
      where: { id: invitation.id },
      data: {
        isActive: false,
        respondedAt: new Date(),
        response: 'ACCEPTED',
      },
    });

    // Update credential status
    await this.prisma.supplierCredential.update({
      where: { id: invitation.credential.id },
      data: { status: 'ONBOARDING_STARTED' },
    });

    await this.prisma.credentialStatusHistory.create({
      data: {
        credentialId: invitation.credential.id,
        fromStatus: invitation.credential.status,
        toStatus: 'ONBOARDING_STARTED',
        reason: 'Convite aceito pelo fornecedor',
      },
    });

    return {
      success: true,
      credentialId: invitation.credential.id,
      brand: invitation.credential.brand,
      cnpj: this.formatCnpj(invitation.credential.cnpj),
      message: 'Convite aceito! Complete o cadastro para continuar.',
    };
  }

  // ==================== HELPER METHODS ====================

  private formatCnpj(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }

  // ========== REPORT EXPORT ==========

  async exportReportPdf(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    const report = await this.getReports(userId, startDate, endDate);
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const fmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(v);

      // Header
      doc
        .fontSize(20)
        .text('Relatório de Operações', { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .fillColor('#666')
        .text(
          `Período: ${report.period.start.toLocaleDateString('pt-BR')} a ${report.period.end.toLocaleDateString('pt-BR')}`,
          { align: 'center' },
        );
      doc.moveDown(1.5);

      // Summary
      doc.fontSize(14).fillColor('#000').text('Resumo');
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(`Total de Pedidos: ${report.summary.totalOrders}`)
        .text(`Faturamento: ${fmt(report.summary.totalRevenue)}`)
        .text(`Ticket Médio: ${fmt(report.summary.avgTicket)}`)
        .text(
          `Nota Média: ${Number(report.summary.avgRating).toFixed(1)}`,
        );
      doc.moveDown(1);

      // Sales
      doc.fontSize(14).text('Vendas');
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(`Aceitos: ${report.sales.accepted}`)
        .text(`Recusados: ${report.sales.rejected}`)
        .text(`Concluídos: ${report.sales.completed}`)
        .text(`Taxa de Aceite: ${report.sales.acceptanceRate}%`);
      doc.moveDown(1);

      // Cancellations
      doc.fontSize(14).text('Cancelamentos');
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(`Total: ${report.cancellations.total}`)
        .text(`Perda Total: ${fmt(report.cancellations.totalLoss)}`)
        .text(`Percentual: ${report.cancellations.percentage}%`);

      if (report.cancellations.byReason.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(10).text('Por Motivo:');
        report.cancellations.byReason.forEach((r) => {
          doc.text(
            `  • ${r.reason}: ${r.count} pedido(s), ${fmt(r.value)} (${r.percentage}%)`,
          );
        });
      }
      doc.moveDown(1);

      // Quality
      doc.fontSize(14).text('Qualidade');
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(
          `Nota Média: ${Number(report.quality.avgRating).toFixed(1)}`,
        )
        .text(`Taxa de Conclusão: ${report.quality.completionRate}%`);

      doc.end();
    });
  }

  async exportReportExcel(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    const report = await this.getReports(userId, startDate, endDate);
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summary = workbook.addWorksheet('Resumo');
    summary.columns = [
      { header: 'Métrica', key: 'metric', width: 25 },
      { header: 'Valor', key: 'value', width: 20 },
    ];
    summary.addRows([
      { metric: 'Total de Pedidos', value: report.summary.totalOrders },
      { metric: 'Faturamento', value: report.summary.totalRevenue },
      { metric: 'Ticket Médio', value: report.summary.avgTicket },
      { metric: 'Nota Média', value: Number(report.summary.avgRating) },
      { metric: 'Aceitos', value: report.sales.accepted },
      { metric: 'Recusados', value: report.sales.rejected },
      { metric: 'Concluídos', value: report.sales.completed },
      {
        metric: 'Taxa de Aceite (%)',
        value: report.sales.acceptanceRate,
      },
      {
        metric: 'Total Cancelamentos',
        value: report.cancellations.total,
      },
      { metric: 'Perda Cancelamentos', value: report.cancellations.totalLoss },
      { metric: 'Taxa de Conclusão (%)', value: report.quality.completionRate },
    ]);
    summary.getRow(1).font = { bold: true };

    // Cancellations by reason sheet
    if (report.cancellations.byReason.length > 0) {
      const reasons = workbook.addWorksheet('Cancelamentos');
      reasons.columns = [
        { header: 'Motivo', key: 'reason', width: 30 },
        { header: 'Quantidade', key: 'count', width: 15 },
        { header: 'Valor (R$)', key: 'value', width: 15 },
        { header: '%', key: 'percentage', width: 10 },
      ];
      report.cancellations.byReason.forEach((r) => {
        reasons.addRow(r);
      });
      reasons.getRow(1).font = { bold: true };
    }

    // Recent cancellations sheet
    if (report.cancellations.recent.length > 0) {
      const recent = workbook.addWorksheet('Recentes');
      recent.columns = [
        { header: 'Código', key: 'code', width: 20 },
        { header: 'Data', key: 'date', width: 15 },
        { header: 'Marca', key: 'brand', width: 20 },
        { header: 'Motivo', key: 'reason', width: 25 },
        { header: 'Valor (R$)', key: 'value', width: 15 },
      ];
      report.cancellations.recent.forEach((r) => {
        recent.addRow(r);
      });
      recent.getRow(1).font = { bold: true };
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
