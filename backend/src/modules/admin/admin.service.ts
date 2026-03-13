import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, CompanyStatus, CompanyType, SupplierDocumentType, SupplierDocumentStatus, CompanyRole } from '@prisma/client';
import { SUPPLIER_STATUS_CHANGED } from '../notifications/events/notification.events';
import type { SupplierStatusChangedEvent } from '../notifications/events/notification.events';
import type { StorageProvider } from '../upload/storage.provider';
import { STORAGE_PROVIDER } from '../upload/storage.provider';
import { AdminCreateCompanyDto, AdminUpdateCompanyDto, AddUserToCompanyDto, AdminRegisterCompanyDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  // Get dashboard metrics
  async getDashboard() {
    const [
      totalOrders,
      activeOrders,
      completedOrders,
      totalSuppliers,
      activeSuppliers,
      pendingSuppliers,
      totalBrands,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.LANCADO_PELA_MARCA,
              OrderStatus.ACEITO_PELA_FACCAO,
              OrderStatus.EM_PRODUCAO,
            ],
          },
        },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.FINALIZADO } }),
      this.prisma.company.count({ where: { type: CompanyType.SUPPLIER } }),
      this.prisma.company.count({
        where: { type: CompanyType.SUPPLIER, status: CompanyStatus.ACTIVE },
      }),
      this.prisma.company.count({
        where: { type: CompanyType.SUPPLIER, status: CompanyStatus.PENDING },
      }),
      this.prisma.company.count({ where: { type: CompanyType.BRAND } }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.FINALIZADO },
        _sum: { totalValue: true },
      }),
    ]);

    // Recent orders
    const recentOrders = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: { select: { tradeName: true } },
        supplier: { select: { tradeName: true } },
      },
    });

    return {
      metrics: {
        totalOrders,
        activeOrders,
        completedOrders,
        totalSuppliers,
        activeSuppliers,
        pendingSuppliers,
        totalBrands,
        totalRevenue: totalRevenue._sum.totalValue || 0,
      },
      recentOrders,
    };
  }

  // Get pending supplier approvals
  async getPendingApprovals() {
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.SUPPLIER,
        status: CompanyStatus.PENDING,
      },
      include: {
        supplierProfile: true,
        companyUsers: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Approve or suspend a supplier with reason and audit trail
  async updateSupplierStatus(
    companyId: string,
    status: CompanyStatus,
    adminId: string,
    reason?: string,
  ) {
    // Get current company data for audit trail
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        status: true,
        tradeName: true,
        legalName: true,
        companyUsers: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    const previousStatus = company.status;
    const companyName = company.tradeName || company.legalName;

    // Get admin name
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true },
    });

    // Update company status with reason
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        status,
        statusReason: reason || null,
        statusChangedAt: new Date(),
        statusChangedById: adminId,
      },
    });

    // Create audit trail record
    const actionLabel = status === CompanyStatus.ACTIVE ? 'ACTIVATED' : 'SUSPENDED';
    await this.prisma.adminAction.create({
      data: {
        companyId,
        adminId,
        action: actionLabel,
        reason: reason || null,
        previousStatus,
        newStatus: status,
      },
    });

    // Emit notification event
    const event: SupplierStatusChangedEvent = {
      companyId,
      companyName,
      previousStatus,
      newStatus: status,
      reason,
      adminId,
      adminName: admin?.name || 'Admin',
    };
    this.eventEmitter.emit(SUPPLIER_STATUS_CHANGED, event);

    this.logger.log(
      `Supplier ${companyId} status changed from ${previousStatus} to ${status} by admin ${adminId}`,
    );

    return updated;
  }

  // Get admin actions for audit trail
  async getAdminActions(limit = 50) {
    return this.prisma.adminAction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, tradeName: true, legalName: true } },
        admin: { select: { id: true, name: true } },
      },
    });
  }

  // Get all suppliers with filters
  async getSuppliers(status?: CompanyStatus, page = 1, limit = 50) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where: {
          type: CompanyType.SUPPLIER,
          ...(status && { status }),
        },
        include: {
          supplierProfile: true,
          _count: { select: { ordersAsSupplier: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.company.count({
        where: {
          type: CompanyType.SUPPLIER,
          ...(status && { status }),
        },
      }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / take) };
  }

  // Get all brands
  async getBrands(status?: CompanyStatus, page = 1, limit = 50) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where: {
          type: CompanyType.BRAND,
          ...(status && { status }),
        },
        include: {
          _count: { select: { ordersAsBrand: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.company.count({
        where: {
          type: CompanyType.BRAND,
          ...(status && { status }),
        },
      }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / take) };
  }

  // Get all orders with filters
  async getOrders(status?: OrderStatus, page = 1, limit = 50) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const where = status ? { status } : undefined;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          brand: { select: { id: true, tradeName: true } },
          supplier: { select: { id: true, tradeName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / take) };
  }

  // Calculate document status based on expiration date
  private calculateDocumentStatus(expiresAt: Date | null, hasFile: boolean): SupplierDocumentStatus {
    if (!hasFile) {
      return SupplierDocumentStatus.PENDING;
    }
    if (!expiresAt) {
      return SupplierDocumentStatus.VALID;
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiresAt < now) {
      return SupplierDocumentStatus.EXPIRED;
    } else if (expiresAt < thirtyDaysFromNow) {
      return SupplierDocumentStatus.EXPIRING_SOON;
    }

    return SupplierDocumentStatus.VALID;
  }

  // Get all documents from all suppliers
  async getAllDocuments(
    supplierId?: string,
    type?: SupplierDocumentType,
    status?: SupplierDocumentStatus,
    page = 1,
    limit = 50,
  ) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const whereClause: any = {};

    if (supplierId) {
      whereClause.companyId = supplierId;
    }

    if (type) {
      whereClause.type = type;
    }

    const [documents, total] = await Promise.all([
      this.prisma.supplierDocument.findMany({
        where: whereClause,
        include: {
          company: { select: { id: true, tradeName: true, document: true } },
          uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.supplierDocument.count({ where: whereClause }),
    ]);

    // Recalculate status and filter if needed
    const processedDocs = documents.map((doc) => {
      const calculatedStatus = this.calculateDocumentStatus(doc.expiresAt, !!doc.fileUrl);
      return { ...doc, status: calculatedStatus };
    });

    // Filter by status after recalculation
    const data = status
      ? processedDocs.filter((doc) => doc.status === status)
      : processedDocs;

    return { data, total, page, totalPages: Math.ceil(total / take) };
  }

  // Get document stats across all suppliers
  async getDocumentsStats() {
    const documents = await this.prisma.supplierDocument.findMany({
      select: {
        id: true,
        fileUrl: true,
        expiresAt: true,
      },
    });

    let valid = 0;
    let expiringSoon = 0;
    let expired = 0;
    let pending = 0;

    documents.forEach((doc) => {
      const status = this.calculateDocumentStatus(doc.expiresAt, !!doc.fileUrl);
      switch (status) {
        case SupplierDocumentStatus.VALID:
          valid++;
          break;
        case SupplierDocumentStatus.EXPIRING_SOON:
          expiringSoon++;
          break;
        case SupplierDocumentStatus.EXPIRED:
          expired++;
          break;
        case SupplierDocumentStatus.PENDING:
          pending++;
          break;
      }
    });

    // Get unique supplier count
    const suppliersWithDocs = await this.prisma.supplierDocument.groupBy({
      by: ['companyId'],
    });

    return {
      total: documents.length,
      valid,
      expiringSoon,
      expired,
      pending,
      suppliersCount: suppliersWithDocs.length,
    };
  }

  // Get documents for a specific supplier
  async getSupplierDocuments(supplierId: string) {
    const documents = await this.prisma.supplierDocument.findMany({
      where: { companyId: supplierId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    // Recalculate status for accuracy
    return documents.map((doc) => {
      const calculatedStatus = this.calculateDocumentStatus(doc.expiresAt, !!doc.fileUrl);
      return { ...doc, status: calculatedStatus };
    });
  }

  // Extract S3 key from a full URL
  private extractKeyFromUrl(url: string): string | null {
    const localMatch = url.match(/\/uploads\/(.+)$/);
    if (localMatch) return localMatch[1];

    const httpsMatch = url.match(/^https?:\/\/[^/]+\/(.+)$/);
    if (httpsMatch) return httpsMatch[1];

    return null;
  }

  // Generate an accessible URL (presigned for S3, direct for local storage)
  private async getAccessibleUrl(document: {
    fileUrl: string | null;
    fileKey?: string | null;
  }): Promise<string> {
    if (!document.fileUrl) return '';
    const key = document.fileKey || this.extractKeyFromUrl(document.fileUrl);
    if (!key) return document.fileUrl;

    if (this.storage.getPresignedUrl) {
      return this.storage.getPresignedUrl(key, 3600);
    }
    return document.fileUrl;
  }

  // Get download URL for a document (admin access - no ownership check)
  async getDocumentDownloadUrl(documentId: string) {
    const document = await this.prisma.supplierDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (!document.fileUrl) {
      throw new BadRequestException('Este documento ainda não possui arquivo anexado');
    }

    const url = await this.getAccessibleUrl(document);

    return {
      url,
      fileName: document.fileName,
      mimeType: document.mimeType,
      expiresIn: 3600,
    };
  }

  /**
   * Get monthly revenue history for dashboard charts
   * Returns last N months of revenue data
   */
  async getRevenueHistory(months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const previousStartDate = new Date(startDate);
    previousStartDate.setMonth(previousStartDate.getMonth() - months);

    // Compute the offset in days (JS) to avoid passing an interval string to PG
    const offsetMs = startDate.getTime() - previousStartDate.getTime();
    const offsetDays = Math.round(offsetMs / (1000 * 60 * 60 * 24));

    const monthlyData = await this.prisma.$queryRaw<
      { month: Date; revenue: number; orders: number; previousRevenue: number }[]
    >`
      WITH current_period AS (
        SELECT
          DATE_TRUNC('month', "updatedAt") as month,
          COALESCE(SUM("totalValue"), 0)::float as revenue,
          COUNT(*)::int as orders
        FROM "orders"
        WHERE "status" = 'FINALIZADO'
          AND "updatedAt" >= ${startDate}
        GROUP BY 1
      ),
      previous_period AS (
        SELECT
          DATE_TRUNC('month', "updatedAt" + (${offsetDays} * INTERVAL '1 day')) as month,
          COALESCE(SUM("totalValue"), 0)::float as previous_revenue
        FROM "orders"
        WHERE "status" = 'FINALIZADO'
          AND "updatedAt" >= ${previousStartDate}
          AND "updatedAt" < ${startDate}
        GROUP BY 1
      )
      SELECT
        c.month,
        c.revenue,
        c.orders,
        COALESCE(p.previous_revenue, 0)::float as "previousRevenue"
      FROM current_period c
      LEFT JOIN previous_period p ON c.month = p.month
      ORDER BY c.month ASC
    `;

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    return monthlyData.map((d) => ({
      month: monthNames[d.month.getMonth()],
      fullMonth: d.month.toISOString(),
      revenue: Number(d.revenue) || 0,
      previousRevenue: Number(d.previousRevenue) || 0,
      orders: Number(d.orders) || 0,
      growth: d.previousRevenue > 0
        ? Math.round(((d.revenue - d.previousRevenue) / d.previousRevenue) * 100)
        : 0,
    }));
  }

  /**
   * Get monthly order statistics
   * Returns orders by status per month
   */
  async getOrdersMonthlyStats(months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [monthlyOrders, byStatus, byBrand] = await Promise.all([
      // Orders per month
      this.prisma.$queryRaw<{ month: Date; total: number; value: number }[]>`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::int as total,
          COALESCE(SUM("totalValue"), 0)::float as value
        FROM "orders"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      // Orders by status
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        _sum: { totalValue: true },
      }),
      // Orders by brand (top 5)
      this.prisma.order.groupBy({
        by: ['brandId'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        _sum: { totalValue: true },
        orderBy: { _sum: { totalValue: 'desc' } },
        take: 5,
      }),
    ]);

    // Get brand names
    const brandIds = byBrand.map((b) => b.brandId);
    const brands = await this.prisma.company.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, tradeName: true },
    });
    const brandMap = new Map(brands.map((b) => [b.id, b.tradeName]));

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    const statusNames: Record<string, string> = {
      LANCADO_PELA_MARCA: 'Novo',
      EM_NEGOCIACAO: 'Em Negociação',
      ACEITO_PELA_FACCAO: 'Aceito',
      EM_PREPARACAO_SAIDA_MARCA: 'Preparando Envio',
      EM_TRANSITO_PARA_FACCAO: 'Em Trânsito (Recebimento)',
      EM_PREPARACAO_ENTRADA_FACCAO: 'Conferindo Insumos',
      EM_PRODUCAO: 'Em Produção',
      PRONTO: 'Pronto',
      EM_TRANSITO_PARA_MARCA: 'Em Trânsito (Devolução)',
      EM_REVISAO: 'Em Revisão',
      PARCIALMENTE_APROVADO: 'Parcialmente Aprovado',
      REPROVADO: 'Reprovado',
      AGUARDANDO_RETRABALHO: 'Aguardando Retrabalho',
      FINALIZADO: 'Concluído',
      RECUSADO_PELA_FACCAO: 'Recusado',
      DISPONIVEL_PARA_OUTRAS: 'Disponível',
    };

    return {
      monthly: monthlyOrders.map((m) => ({
        month: monthNames[m.month.getMonth()],
        total: Number(m.total) || 0,
        value: Number(m.value) || 0,
      })),
      byStatus: byStatus.map((s) => ({
        status: statusNames[s.status] || s.status,
        count: s._count,
        value: Number(s._sum.totalValue) || 0,
      })),
      byBrand: byBrand.map((b) => ({
        brand: brandMap.get(b.brandId) || 'Desconhecido',
        count: b._count,
        value: Number(b._sum.totalValue) || 0,
      })),
    };
  }

  // ========== Company CRUD ==========

  async createCompany(dto: AdminCreateCompanyDto, adminId: string) {
    const existing = await this.prisma.company.findUnique({
      where: { document: dto.document },
    });

    if (existing) {
      throw new ConflictException('Já existe uma empresa com este CNPJ');
    }

    const company = await this.prisma.company.create({
      data: {
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        document: dto.document,
        type: dto.type,
        city: dto.city,
        state: dto.state,
        phone: dto.phone,
        email: dto.email,
        status: CompanyStatus.ACTIVE,
        statusChangedAt: new Date(),
        statusChangedById: adminId,
        ...(dto.type === CompanyType.SUPPLIER && {
          supplierProfile: {
            create: {},
          },
        }),
        ...(dto.ownerUserId && {
          companyUsers: {
            create: {
              userId: dto.ownerUserId,
              companyRole: CompanyRole.ADMIN,
              isCompanyAdmin: true,
            },
          },
        }),
      },
      include: {
        supplierProfile: true,
        companyUsers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    await this.prisma.adminAction.create({
      data: {
        companyId: company.id,
        adminId,
        action: 'CREATED',
        newStatus: CompanyStatus.ACTIVE,
      },
    });

    return company;
  }

  async updateCompany(id: string, dto: AdminUpdateCompanyDto, adminId: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (dto.document && dto.document !== company.document) {
      const existing = await this.prisma.company.findUnique({
        where: { document: dto.document },
      });
      if (existing) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.tradeName !== undefined && { tradeName: dto.tradeName }),
        ...(dto.document !== undefined && { document: dto.document }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
      include: {
        supplierProfile: true,
        companyUsers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    await this.prisma.adminAction.create({
      data: {
        companyId: id,
        adminId,
        action: 'UPDATED',
      },
    });

    return updated;
  }

  async updateCompanyStatus(
    companyId: string,
    status: CompanyStatus,
    adminId: string,
    reason?: string,
  ) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        status: true,
        tradeName: true,
        legalName: true,
        type: true,
      },
    });

    const previousStatus = company.status;

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        status,
        statusReason: reason || null,
        statusChangedAt: new Date(),
        statusChangedById: adminId,
      },
    });

    const actionLabel = status === CompanyStatus.ACTIVE ? 'ACTIVATED' : 'SUSPENDED';
    await this.prisma.adminAction.create({
      data: {
        companyId,
        adminId,
        action: actionLabel,
        reason: reason || null,
        previousStatus,
        newStatus: status,
      },
    });

    this.logger.log(
      `Company ${companyId} status changed from ${previousStatus} to ${status} by admin ${adminId}`,
    );

    return updated;
  }

  async deleteCompany(companyId: string, adminId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const previousStatus = company.status;

    // Soft delete - set status to SUSPENDED and mark reason
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        status: CompanyStatus.SUSPENDED,
        statusReason: 'Excluída pelo administrador',
        statusChangedAt: new Date(),
        statusChangedById: adminId,
      },
    });

    await this.prisma.adminAction.create({
      data: {
        companyId,
        adminId,
        action: 'DELETED',
        reason: 'Excluída pelo administrador',
        previousStatus,
        newStatus: CompanyStatus.SUSPENDED,
      },
    });

    this.logger.log(`Company ${companyId} soft-deleted by admin ${adminId}`);

    return { success: true, message: 'Empresa excluída com sucesso' };
  }

  async addUserToCompany(companyId: string, dto: AddUserToCompanyDto, adminId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const existing = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId: dto.userId, companyId } },
    });
    if (existing) {
      throw new ConflictException('Usuário já está vinculado a esta empresa');
    }

    return this.prisma.companyUser.create({
      data: {
        userId: dto.userId,
        companyId,
        companyRole: dto.companyRole || CompanyRole.VIEWER,
        isCompanyAdmin: dto.isCompanyAdmin || false,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, tradeName: true, type: true } },
      },
    });
  }

  async removeUserFromCompany(companyId: string, userId: string) {
    const link = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!link) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    await this.prisma.companyUser.delete({
      where: { id: link.id },
    });

    return { success: true, message: 'Usuário removido da empresa' };
  }

  // ========== Register Company (full flow) ==========

  async registerCompany(dto: AdminRegisterCompanyDto, adminId: string) {
    const email = dto.email.toLowerCase().trim();

    // Hash password outside transaction (CPU-intensive)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      // Validate unique email
      const existingUser = await tx.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }

      // Validate unique CNPJ
      const existingCompany = await tx.company.findUnique({
        where: { document: dto.document },
      });
      if (existingCompany) {
        throw new ConflictException('Já existe uma empresa com este CNPJ');
      }

      // Create user
      const userRole = dto.type === CompanyType.SUPPLIER ? 'SUPPLIER' : 'BRAND';
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: dto.userName,
          role: userRole,
          isActive: true,
        },
      });

      // Create company
      const company = await tx.company.create({
        data: {
          legalName: dto.legalName,
          tradeName: dto.tradeName || dto.legalName,
          document: dto.document,
          type: dto.type,
          city: dto.city,
          state: dto.state,
          phone: dto.companyPhone || dto.userPhone,
          email: (dto.companyEmail || email).toLowerCase().trim(),
          status: CompanyStatus.ACTIVE,
          statusChangedAt: new Date(),
          statusChangedById: adminId,
        },
      });

      // Create CompanyUser link (owner)
      await tx.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'OWNER',
          companyRole: CompanyRole.ADMIN,
          isCompanyAdmin: true,
        },
      });

      // Create profile based on type
      if (dto.type === CompanyType.SUPPLIER) {
        const activeWorkers = dto.qtdCostureiras || 0;
        const dailyCapacity = activeWorkers > 0 ? activeWorkers * 8 * 60 : undefined;

        await tx.supplierProfile.create({
          data: {
            companyId: company.id,
            onboardingPhase: 3,
            onboardingComplete: true,
            productTypes: dto.productTypes,
            specialties: dto.machines || [],
            activeWorkers: activeWorkers || undefined,
            dailyCapacity,
            businessQualification: {
              qtdColaboradores: dto.qtdCostureiras,
              tempoMercado: dto.tempoMercado,
            },
          },
        });
      } else {
        await tx.brandProfile.create({
          data: {
            companyId: company.id,
            onboardingPhase: 3,
            onboardingComplete: true,
            productTypes: dto.productTypes,
            specialties: dto.specialties || [],
            monthlyVolume: dto.monthlyVolume,
            businessQualification: {
              tempoMercado: dto.tempoMercado,
            },
          },
        });
      }

      // Audit trail
      await tx.adminAction.create({
        data: {
          companyId: company.id,
          adminId,
          action: 'REGISTERED',
          newStatus: CompanyStatus.ACTIVE,
        },
      });

      return { company, user };
    });

    // Return company with profile and user
    const company = await this.prisma.company.findUnique({
      where: { id: result.company.id },
      include: {
        supplierProfile: true,
        brandProfile: true,
        companyUsers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    this.logger.log(
      `Company ${result.company.id} (${dto.type}) registered by admin ${adminId}`,
    );

    return company;
  }
}
