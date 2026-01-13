import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { PaymentStatus, CompanyType } from '@prisma/client';

@Injectable()
export class PaymentsService {
    constructor(private prisma: PrismaService) { }

    // Create payment for an order
    async create(orderId: string, userId: string, dto: CreatePaymentDto) {
        // Verify user has access (brand owner)
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                brand: { include: { companyUsers: true } },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const isBrandUser = order.brand.companyUsers.some((cu) => cu.userId === userId);
        if (!isBrandUser) {
            throw new ForbiddenException('Only brand can create payments');
        }

        return this.prisma.payment.create({
            data: {
                orderId,
                amount: dto.amount,
                dueDate: new Date(dto.dueDate),
                method: dto.method,
                notes: dto.notes,
                status: PaymentStatus.PENDENTE,
            },
        });
    }

    // Update payment status
    async update(paymentId: string, userId: string, dto: UpdatePaymentDto) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                order: {
                    include: {
                        brand: { include: { companyUsers: true } },
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                ...(dto.status && { status: dto.status }),
                ...(dto.paidDate && { paidDate: new Date(dto.paidDate) }),
                ...(dto.proofUrl && { proofUrl: dto.proofUrl }),
            },
        });
    }

    // Get payments for an order
    async getOrderPayments(orderId: string) {
        return this.prisma.payment.findMany({
            where: { orderId },
            orderBy: { dueDate: 'asc' },
        });
    }

    // Get financial summary for a supplier
    async getSupplierFinancialSummary(userId: string) {
        const companyUser = await this.prisma.companyUser.findFirst({
            where: {
                userId,
                company: { type: CompanyType.SUPPLIER },
            },
        });

        if (!companyUser) {
            throw new NotFoundException('Supplier company not found');
        }

        const [pending, paid, overdue, total] = await Promise.all([
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                    status: PaymentStatus.PENDENTE,
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                    status: PaymentStatus.PAGO,
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                    status: PaymentStatus.ATRASADO,
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                },
                _sum: { amount: true },
            }),
        ]);

        // Get recent payments
        const recentPayments = await this.prisma.payment.findMany({
            where: {
                order: { supplierId: companyUser.companyId },
            },
            include: {
                order: {
                    select: { displayId: true, productName: true, brand: { select: { tradeName: true } } },
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 10,
        });

        return {
            summary: {
                pending: pending._sum.amount || 0,
                paid: paid._sum.amount || 0,
                overdue: overdue._sum.amount || 0,
                total: total._sum.amount || 0,
            },
            recentPayments,
        };
    }
}
