import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, CompanyStatus, CompanyType, SupplierDocumentType, SupplierDocumentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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

  // Approve or suspend a supplier
  async updateSupplierStatus(companyId: string, status: CompanyStatus) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: { status },
    });
  }

  // Get all suppliers with filters
  async getSuppliers(status?: CompanyStatus) {
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.SUPPLIER,
        ...(status && { status }),
      },
      include: {
        supplierProfile: true,
        _count: { select: { ordersAsSupplier: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get all brands
  async getBrands(status?: CompanyStatus) {
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.BRAND,
        ...(status && { status }),
      },
      include: {
        _count: { select: { ordersAsBrand: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get all orders with filters
  async getOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
  ) {
    const whereClause: any = {};

    if (supplierId) {
      whereClause.companyId = supplierId;
    }

    if (type) {
      whereClause.type = type;
    }

    const documents = await this.prisma.supplierDocument.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, tradeName: true, document: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    // Recalculate status and filter if needed
    const processedDocs = documents.map((doc) => {
      const calculatedStatus = this.calculateDocumentStatus(doc.expiresAt, !!doc.fileUrl);
      return { ...doc, status: calculatedStatus };
    });

    // Filter by status after recalculation
    if (status) {
      return processedDocs.filter((doc) => doc.status === status);
    }

    return processedDocs;
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
}
