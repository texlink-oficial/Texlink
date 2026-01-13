import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingPhase2Dto, OnboardingPhase3Dto, SupplierFilterDto } from './dto';
import { CompanyType, CompanyStatus, OrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

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

    // Get dashboard data for supplier
    async getDashboard(userId: string) {
        const company = await this.getMyProfile(userId);

        // Get order statistics
        const [pendingOrders, activeOrders, completedOrders, totalRevenue] = await Promise.all([
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
                    status: {
                        in: [
                            OrderStatus.ACEITO_PELA_FACCAO,
                            OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
                            OrderStatus.EM_PREPARACAO_ENTRADA_FACCAO,
                            OrderStatus.EM_PRODUCAO,
                            OrderStatus.PRONTO,
                        ],
                    },
                },
            }),
            // Completed this month
            this.prisma.order.count({
                where: {
                    supplierId: company.id,
                    status: OrderStatus.FINALIZADO,
                    updatedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
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
        ]);

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
                capacityUsage: company.supplierProfile?.currentOccupancy || 0,
            },
        };
    }

    // Get available opportunities (orders waiting for acceptance)
    async getOpportunities(userId: string) {
        const company = await this.getMyProfile(userId);

        return this.prisma.order.findMany({
            where: {
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
                    // Orders available to all (after rejection)
                    {
                        status: OrderStatus.DISPONIVEL_PARA_OUTRAS,
                    },
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
            },
            orderBy: { createdAt: 'desc' },
        });
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
                ...where.supplierProfile as object,
                productTypes: { hasSome: filters.productTypes },
            };
        }

        if (filters.specialties?.length) {
            where.supplierProfile = {
                ...where.supplierProfile as object,
                specialties: { hasSome: filters.specialties },
            };
        }

        if (filters.minCapacity || filters.maxCapacity) {
            where.supplierProfile = {
                ...where.supplierProfile as object,
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
}
