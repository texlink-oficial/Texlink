import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { PaymentStatus, CompanyType } from '@prisma/client';
import {
  PAYMENT_REGISTERED,
  PAYMENT_RECEIVED,
  PaymentRegisteredEvent,
  PaymentReceivedEvent,
} from '../notifications/events/notification.events';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

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

    const isBrandUser = order.brand.companyUsers.some(
      (cu) => cu.userId === userId,
    );
    if (!isBrandUser) {
      throw new ForbiddenException('Only brand can create payments');
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        method: dto.method,
        notes: dto.notes,
        status: PaymentStatus.PENDENTE,
      },
    });

    // Emit payment registered event
    if (order.supplierId) {
      const event: PaymentRegisteredEvent = {
        paymentId: payment.id,
        orderId,
        orderDisplayId: order.displayId,
        brandId: order.brandId,
        supplierId: order.supplierId,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
      };
      this.eventEmitter.emit(PAYMENT_REGISTERED, event);
      this.logger.log(
        `Emitted payment.registered event for order ${order.displayId}`,
      );
    }

    return payment;
  }

  // Update payment status
  async update(paymentId: string, userId: string, dto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            displayId: true,
            brandId: true,
            supplierId: true,
            brand: { include: { companyUsers: true } },
            supplier: { include: { companyUsers: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify user has access (brand or supplier member)
    const isBrandUser = payment.order.brand.companyUsers.some(
      (cu) => cu.userId === userId,
    );
    const isSupplierUser = payment.order.supplier?.companyUsers.some(
      (cu) => cu.userId === userId,
    );
    if (!isBrandUser && !isSupplierUser) {
      throw new ForbiddenException(
        'You do not have access to this payment',
      );
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.paidDate && { paidDate: new Date(dto.paidDate) }),
        ...(dto.proofUrl && { proofUrl: dto.proofUrl }),
      },
    });

    // Emit payment received event when status changes to PAGO
    if (dto.status === PaymentStatus.PAGO && payment.order.supplierId) {
      const event: PaymentReceivedEvent = {
        paymentId,
        orderId: payment.orderId,
        orderDisplayId: payment.order.displayId,
        brandId: payment.order.brandId,
        supplierId: payment.order.supplierId,
        amount: Number(payment.amount),
        paidDate: dto.paidDate ? new Date(dto.paidDate) : new Date(),
      };
      this.eventEmitter.emit(PAYMENT_RECEIVED, event);
      this.logger.log(
        `Emitted payment.received event for order ${payment.order.displayId}`,
      );
    }

    return updatedPayment;
  }

  // Get payments for an order
  async getOrderPayments(orderId: string, userId: string) {
    // Verify user has access to this order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        brand: { include: { companyUsers: { select: { userId: true } } } },
        supplier: { include: { companyUsers: { select: { userId: true } } } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isBrandUser = order.brand.companyUsers.some(
      (cu) => cu.userId === userId,
    );
    const isSupplierUser = order.supplier?.companyUsers.some(
      (cu) => cu.userId === userId,
    );
    if (!isBrandUser && !isSupplierUser) {
      throw new ForbiddenException(
        'You do not have access to this order\'s payments',
      );
    }

    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { dueDate: 'asc' },
    });
  }

  // Get financial dashboard for a supplier
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

    const supplierId = companyUser.companyId;
    const paymentOrderInclude = {
      order: {
        select: {
          displayId: true,
          productName: true,
          brand: { select: { tradeName: true } },
        },
      },
    };

    const [
      pendingAgg,
      paidAgg,
      overdueAgg,
      totalAgg,
      pendingPayments,
      overduePayments,
      recentPayments,
      monthlyData,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          order: { supplierId },
          status: PaymentStatus.PENDENTE,
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          order: { supplierId },
          status: PaymentStatus.PAGO,
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          order: { supplierId },
          status: PaymentStatus.ATRASADO,
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          order: { supplierId },
        },
        _sum: { amount: true },
      }),
      // Pending payments list
      this.prisma.payment.findMany({
        where: {
          order: { supplierId },
          status: PaymentStatus.PENDENTE,
        },
        include: paymentOrderInclude,
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // Overdue payments list
      this.prisma.payment.findMany({
        where: {
          order: { supplierId },
          status: PaymentStatus.ATRASADO,
        },
        include: paymentOrderInclude,
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // Recent paid payments
      this.prisma.payment.findMany({
        where: {
          order: { supplierId },
          status: PaymentStatus.PAGO,
        },
        include: paymentOrderInclude,
        orderBy: { paidDate: 'desc' },
        take: 10,
      }),
      // Monthly aggregation (last 5 months)
      this.prisma.$queryRaw<
        { month: Date; received: number; pending: number }[]
      >`
        SELECT
          DATE_TRUNC('month', p."dueDate") as month,
          COALESCE(SUM(CASE WHEN p."status" = 'PAGO' THEN p."amount" ELSE 0 END), 0)::float as received,
          COALESCE(SUM(CASE WHEN p."status" IN ('PENDENTE', 'ATRASADO') THEN p."amount" ELSE 0 END), 0)::float as pending
        FROM "payments" p
        JOIN "orders" o ON p."orderId" = o."id"
        WHERE o."supplierId" = ${supplierId}
          AND p."dueDate" >= NOW() - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', p."dueDate")
        ORDER BY month ASC
      `,
    ]);

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    return {
      totalReceivable: Number(totalAgg._sum.amount) || 0,
      totalReceived: Number(paidAgg._sum.amount) || 0,
      totalPending: Number(pendingAgg._sum.amount) || 0,
      totalOverdue: Number(overdueAgg._sum.amount) || 0,
      pendingPayments,
      overduePayments,
      recentPayments,
      monthlyData: monthlyData.map((m) => ({
        month: monthNames[m.month.getMonth()],
        received: Number(m.received) || 0,
        pending: Number(m.pending) || 0,
      })),
    };
  }
}
