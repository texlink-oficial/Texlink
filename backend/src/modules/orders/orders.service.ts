import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto, CreateReviewDto, CreateChildOrderDto } from './dto';
import { OrderStatus, OrderAssignmentType, CompanyType, OrderTargetStatus, ReviewResult, OrderOrigin } from '@prisma/client';

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

    // Generate child display ID: TX-YYYYMMDD-XXXX-R1, R2, etc.
    private generateChildDisplayId(parentDisplayId: string, revisionNumber: number): string {
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
            throw new ForbiddenException('You must have a brand company to create orders');
        }

        const totalValue = dto.quantity * dto.pricePerUnit;
        const platformFeePercentage = 0.10; // 10%
        const platformFee = totalValue * platformFeePercentage;
        const netValue = totalValue - platformFee;

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
            : {
                OR: [
                    { supplierId: companyUser.companyId },
                    { targetSuppliers: { some: { supplierId: companyUser.companyId } } },
                    {
                        assignmentType: 'HYBRID',
                        status: 'LANCADO_PELA_MARCA', // Only show open hybrid orders if they are in initial status
                        // Don't show if already assigned (checked by supplierId clause)
                        supplierId: null
                    }
                ]
            };

        if (status) {
            whereClause.status = status;
        }

        const orders = await this.prisma.order.findMany({
            where: whereClause,
            include: {
                brand: { select: { id: true, tradeName: true } },
                supplier: { select: { id: true, tradeName: true } },
                targetSuppliers: { include: { supplier: { select: { id: true, tradeName: true } } } },
                _count: { select: { messages: true, attachments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Financial Privacy Masking
        if (role === 'SUPPLIER') {
            return orders.map(order => ({
                ...order,
                totalValue: order.netValue || order.totalValue,
                pricePerUnit: order.netValue ? Number(order.netValue) / order.quantity : order.pricePerUnit,
                platformFee: undefined
            }));
        }

        return orders;
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

        // Financial Privacy Masking for Supplier
        const companyUser = await this.prisma.companyUser.findFirst({
            where: { userId, companyId: order.supplierId || undefined },
            include: { company: true }
        });

        const isSupplier = companyUser && companyUser.company.type === CompanyType.SUPPLIER;

        if (isSupplier) {
            return {
                ...order,
                totalValue: order.netValue || order.totalValue,
                pricePerUnit: order.netValue ? Number(order.netValue) / order.quantity : order.pricePerUnit,
                platformFee: undefined
            };
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
                parentOrder: { select: { id: true, displayId: true } },
                _count: { select: { messages: true, attachments: true, childOrders: true } },
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
        const totalItems = dto.approvedQuantity + dto.rejectedQuantity + (dto.secondQualityQuantity || 0);
        if (totalItems !== dto.totalQuantity) {
            throw new BadRequestException('Sum of approved, rejected and second quality must equal total quantity');
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
                rejectedItems: dto.rejectedItems?.length ? {
                    createMany: {
                        data: dto.rejectedItems.map(item => ({
                            reason: item.reason,
                            quantity: item.quantity,
                            defectDescription: item.defectDescription,
                            requiresRework: item.requiresRework ?? true,
                        })),
                    },
                } : undefined,
            },
            include: {
                rejectedItems: true,
                reviewedBy: { select: { id: true, name: true } },
            },
        });

        // Create second quality items if any
        if (dto.secondQualityItems?.length) {
            await this.prisma.secondQualityItem.createMany({
                data: dto.secondQualityItems.map(item => ({
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
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
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
    async createChildOrder(parentOrderId: string, userId: string, dto: CreateChildOrderDto) {
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
            parentOrder.revisionNumber
        );
        const nextRevision = maxRevision + 1;

        // Generate child display ID
        const baseDisplayId = parentOrder.displayId.split('-R')[0]; // Remove any existing -R suffix
        const childDisplayId = this.generateChildDisplayId(baseDisplayId, nextRevision);

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
                description: dto.description || `Retrabalho do pedido ${parentOrder.displayId}`,
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
    async addSecondQualityItems(orderId: string, userId: string, items: { quantity: number; defectType: string; defectDescription?: string; discountPercentage?: number }[]) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const createdItems = await this.prisma.secondQualityItem.createMany({
            data: items.map(item => ({
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
        const ordersWithReviews = orders.filter(o => o.totalReviewCount > 0).length;
        const ordersWithRework = orders.filter(o => o.childOrders.length > 0).length;
        const totalSecondQuality = orders.reduce((sum, o) => sum + o.secondQualityCount, 0);

        // Calculate approval rate
        const reviewedOrders = orders.filter(o => o.reviews.length > 0);
        const approvedFirstTime = reviewedOrders.filter(o =>
            o.reviews.length === 1 && o.reviews[0].result === 'APPROVED'
        ).length;
        const firstTimeApprovalRate = reviewedOrders.length > 0
            ? (approvedFirstTime / reviewedOrders.length) * 100
            : 0;

        return {
            totalOrders,
            ordersWithReviews,
            ordersWithRework,
            totalSecondQuality,
            firstTimeApprovalRate: Math.round(firstTimeApprovalRate * 10) / 10,
            reworkRate: totalOrders > 0 ? Math.round((ordersWithRework / totalOrders) * 1000) / 10 : 0,
        };
    }
}
