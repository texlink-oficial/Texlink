import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { OrderStatus, OrderAssignmentType, CompanyType, OrderTargetStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) { }

    // Generate display ID: TX-YYYYMMDD-XXXX
    private generateDisplayId(): string {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `TX-${dateStr}-${random}`;
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
            throw new ForbiddenException('You must have a brand company to create orders');
        }

        const totalValue = dto.quantity * dto.pricePerUnit;

        // Build order data
        const orderData: any = {
            displayId: this.generateDisplayId(),
            brandId: companyUser.companyId,
            status: OrderStatus.LANCADO_PELA_MARCA,
            assignmentType: dto.assignmentType,
            productType: dto.productType,
            productCategory: dto.productCategory,
            productName: dto.productName,
            description: dto.description,
            quantity: dto.quantity,
            pricePerUnit: dto.pricePerUnit,
            totalValue,
            deliveryDeadline: new Date(dto.deliveryDeadline),
            paymentTerms: dto.paymentTerms,
            materialsProvided: dto.materialsProvided ?? false,
            observations: dto.observations,
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
                throw new BadRequestException('supplierId is required for DIRECT orders');
            }
            orderData.supplierId = dto.supplierId;
        } else if (dto.assignmentType === OrderAssignmentType.BIDDING) {
            if (!dto.targetSupplierIds?.length) {
                throw new BadRequestException('targetSupplierIds is required for BIDDING orders');
            }
            orderData.targetSuppliers = {
                createMany: {
                    data: dto.targetSupplierIds.map((supplierId) => ({
                        supplierId,
                        status: OrderTargetStatus.PENDING,
                    })),
                },
            };
        }

        return this.prisma.order.create({
            data: orderData,
            include: {
                brand: { select: { id: true, tradeName: true } },
                supplier: { select: { id: true, tradeName: true } },
                targetSuppliers: true,
                statusHistory: true,
            },
        });
    }

    // Get my orders (Brand or Supplier)
    async getMyOrders(userId: string, role: 'BRAND' | 'SUPPLIER', status?: OrderStatus) {
        const companyUser = await this.prisma.companyUser.findFirst({
            where: {
                userId,
                company: { type: role === 'BRAND' ? CompanyType.BRAND : CompanyType.SUPPLIER },
            },
        });

        if (!companyUser) {
            throw new NotFoundException('Company not found');
        }

        const whereClause: any = role === 'BRAND'
            ? { brandId: companyUser.companyId }
            : { supplierId: companyUser.companyId };

        if (status) {
            whereClause.status = status;
        }

        return this.prisma.order.findMany({
            where: whereClause,
            include: {
                brand: { select: { id: true, tradeName: true, avgRating: true } },
                supplier: { select: { id: true, tradeName: true, avgRating: true } },
                attachments: true,
                _count: { select: { messages: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get order by ID
    async getById(id: string, userId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
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
                        (t) => t.supplierId === companyUser.companyId && t.status === OrderTargetStatus.PENDING,
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
            return this.prisma.order.update({
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
                            notes: 'All targeted suppliers rejected, order available for others',
                        },
                    },
                },
            });
        }

        return order;
    }

    // Update order status (general status progression)
    async updateStatus(orderId: string, userId: string, dto: UpdateOrderStatusDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return this.prisma.order.update({
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
    }

    // Get all orders (Admin)
    async getAllOrders(status?: OrderStatus) {
        return this.prisma.order.findMany({
            where: status ? { status } : undefined,
            include: {
                brand: { select: { id: true, tradeName: true } },
                supplier: { select: { id: true, tradeName: true } },
                _count: { select: { messages: true, attachments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
