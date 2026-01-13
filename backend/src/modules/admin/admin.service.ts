import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, CompanyStatus, CompanyType } from '@prisma/client';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

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
                where: { type: CompanyType.SUPPLIER, status: CompanyStatus.ACTIVE }
            }),
            this.prisma.company.count({
                where: { type: CompanyType.SUPPLIER, status: CompanyStatus.PENDING }
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
}
