import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentStatus, CompanyType } from '@prisma/client';
import {
  PAYMENT_REGISTERED,
  PAYMENT_RECEIVED,
} from '../notifications/events/notification.events';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    companyUser: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create (Payment creation)', () => {
    const mockOrder = {
      id: 'order-1',
      displayId: 'TX-20260207-ABCD',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      brand: {
        id: 'brand-1',
        companyUsers: [
          { userId: 'brand-user-1' },
          { userId: 'brand-user-2' },
        ],
      },
    };

    const mockCreateDto = {
      amount: 5000,
      dueDate: '2026-03-15',
      method: 'PIX',
      notes: 'First installment',
    };

    const mockPayment = {
      id: 'payment-1',
      orderId: 'order-1',
      amount: 5000,
      dueDate: new Date('2026-03-15'),
      method: 'PIX',
      notes: 'First installment',
      status: PaymentStatus.PENDENTE,
    };

    it('should create payment for an order when user is brand member', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.create('order-1', 'brand-user-1', mockCreateDto);

      expect(result).toEqual(mockPayment);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          brand: { include: { companyUsers: true } },
        },
      });
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          amount: 5000,
          dueDate: new Date('2026-03-15'),
          method: 'PIX',
          notes: 'First installment',
          status: PaymentStatus.PENDENTE,
        },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent-order', 'brand-user-1', mockCreateDto),
      ).rejects.toThrow(new NotFoundException('Order not found'));

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not brand member', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.create('order-1', 'unauthorized-user', mockCreateDto),
      ).rejects.toThrow(
        new ForbiddenException('Only brand can create payments'),
      );

      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should emit payment.registered event when order has supplier', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      await service.create('order-1', 'brand-user-1', mockCreateDto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        PAYMENT_REGISTERED,
        expect.objectContaining({
          paymentId: 'payment-1',
          orderId: 'order-1',
          orderDisplayId: 'TX-20260207-ABCD',
          brandId: 'brand-1',
          supplierId: 'supplier-1',
          amount: 5000,
          dueDate: new Date('2026-03-15'),
        }),
      );
    });

    it('should NOT emit event when order has no supplier', async () => {
      const orderWithoutSupplier = {
        ...mockOrder,
        supplierId: null,
      };

      mockPrisma.order.findUnique.mockResolvedValue(orderWithoutSupplier);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      await service.create('order-1', 'brand-user-1', mockCreateDto);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('update (Payment update)', () => {
    const mockPayment = {
      id: 'payment-1',
      orderId: 'order-1',
      amount: 5000,
      status: PaymentStatus.PENDENTE,
      order: {
        id: 'order-1',
        displayId: 'TX-20260207-ABCD',
        brandId: 'brand-1',
        supplierId: 'supplier-1',
        brand: {
          companyUsers: [{ userId: 'brand-user-1' }],
        },
        supplier: {
          companyUsers: [{ userId: 'supplier-user-1' }],
        },
      },
    };

    it('should update payment status when user is brand member', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.PAGO,
        paidDate: new Date('2026-03-10'),
      };
      mockPrisma.payment.update.mockResolvedValue(updatedPayment);

      const result = await service.update('payment-1', 'brand-user-1', {
        status: PaymentStatus.PAGO,
        paidDate: '2026-03-10',
      });

      expect(result).toEqual(updatedPayment);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: PaymentStatus.PAGO,
          paidDate: new Date('2026-03-10'),
        },
      });
    });

    it('should update payment status when user is supplier member', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      const updatedPayment = {
        ...mockPayment,
        proofUrl: 'https://example.com/proof.pdf',
      };
      mockPrisma.payment.update.mockResolvedValue(updatedPayment);

      const result = await service.update('payment-1', 'supplier-user-1', {
        proofUrl: 'https://example.com/proof.pdf',
      });

      expect(result).toEqual(updatedPayment);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          proofUrl: 'https://example.com/proof.pdf',
        },
      });
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-payment', 'brand-user-1', {
          status: PaymentStatus.PAGO,
        }),
      ).rejects.toThrow(new NotFoundException('Payment not found'));

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is neither brand nor supplier member', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.update('payment-1', 'unauthorized-user', {
          status: PaymentStatus.PAGO,
        }),
      ).rejects.toThrow(
        new ForbiddenException('You do not have access to this payment'),
      );

      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('should emit payment.received event when status changes to PAGO', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PAGO,
      });

      await service.update('payment-1', 'brand-user-1', {
        status: PaymentStatus.PAGO,
        paidDate: '2026-03-10',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        PAYMENT_RECEIVED,
        expect.objectContaining({
          paymentId: 'payment-1',
          orderId: 'order-1',
          orderDisplayId: 'TX-20260207-ABCD',
          brandId: 'brand-1',
          supplierId: 'supplier-1',
          amount: 5000,
          paidDate: new Date('2026-03-10'),
        }),
      );
    });

    it('should use current date as paidDate when status is PAGO and no paidDate provided', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PAGO,
      });

      const beforeTest = new Date();

      await service.update('payment-1', 'brand-user-1', {
        status: PaymentStatus.PAGO,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        PAYMENT_RECEIVED,
        expect.objectContaining({
          paymentId: 'payment-1',
          paidDate: expect.any(Date),
        }),
      );

      const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
      expect(emittedEvent.paidDate.getTime()).toBeGreaterThanOrEqual(
        beforeTest.getTime(),
      );
    });

    it('should NOT emit event for non-PAGO status updates', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.ATRASADO,
      });

      await service.update('payment-1', 'brand-user-1', {
        status: PaymentStatus.ATRASADO,
      });

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should NOT emit event when status is PAGO but order has no supplier', async () => {
      const paymentWithoutSupplier = {
        ...mockPayment,
        order: {
          ...mockPayment.order,
          supplierId: null,
          supplier: null,
        },
      };
      mockPrisma.payment.findUnique.mockResolvedValue(paymentWithoutSupplier);
      mockPrisma.payment.update.mockResolvedValue({
        ...paymentWithoutSupplier,
        status: PaymentStatus.PAGO,
      });

      await service.update('payment-1', 'brand-user-1', {
        status: PaymentStatus.PAGO,
      });

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('getOrderPayments (List order payments)', () => {
    const mockOrder = {
      id: 'order-1',
      brand: {
        companyUsers: [{ userId: 'brand-user-1' }],
      },
      supplier: {
        companyUsers: [{ userId: 'supplier-user-1' }],
      },
    };

    const mockPayments = [
      {
        id: 'payment-1',
        orderId: 'order-1',
        amount: 2500,
        dueDate: new Date('2026-03-01'),
        status: PaymentStatus.PAGO,
      },
      {
        id: 'payment-2',
        orderId: 'order-1',
        amount: 2500,
        dueDate: new Date('2026-04-01'),
        status: PaymentStatus.PENDENTE,
      },
    ];

    it('should return payments for authorized brand user', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.getOrderPayments('order-1', 'brand-user-1');

      expect(result).toEqual(mockPayments);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        orderBy: { dueDate: 'asc' },
      });
    });

    it('should return payments for authorized supplier user', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.getOrderPayments('order-1', 'supplier-user-1');

      expect(result).toEqual(mockPayments);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        orderBy: { dueDate: 'asc' },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrderPayments('nonexistent-order', 'brand-user-1'),
      ).rejects.toThrow(new NotFoundException('Order not found'));

      expect(mockPrisma.payment.findMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.getOrderPayments('order-1', 'unauthorized-user'),
      ).rejects.toThrow(
        new ForbiddenException(
          "You do not have access to this order's payments",
        ),
      );

      expect(mockPrisma.payment.findMany).not.toHaveBeenCalled();
    });

    it('should handle order with no supplier (null supplier)', async () => {
      const orderWithoutSupplier = {
        ...mockOrder,
        supplier: null,
      };
      mockPrisma.order.findUnique.mockResolvedValue(orderWithoutSupplier);
      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.getOrderPayments('order-1', 'brand-user-1');

      expect(result).toEqual(mockPayments);
    });
  });

  describe('getSupplierFinancialSummary (Financial dashboard)', () => {
    it('should throw NotFoundException when user has no supplier company', async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);

      await expect(
        service.getSupplierFinancialSummary('non-supplier-user'),
      ).rejects.toThrow(
        new NotFoundException('Supplier company not found'),
      );

      expect(mockPrisma.companyUser.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'non-supplier-user',
          company: { type: CompanyType.SUPPLIER },
        },
      });
    });

    it('should query for supplier company with correct filters', async () => {
      // Set up the companyUser mock to return a valid supplier user
      mockPrisma.companyUser.findFirst.mockResolvedValue({
        userId: 'supplier-user-1',
        companyId: 'supplier-1',
      });

      // Mock all 8 parallel queries that getSupplierFinancialSummary runs
      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 3000 } })  // pendingAgg
        .mockResolvedValueOnce({ _sum: { amount: 7000 } })  // paidAgg
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })  // overdueAgg
        .mockResolvedValueOnce({ _sum: { amount: 11000 } }); // totalAgg
      mockPrisma.payment.findMany
        .mockResolvedValueOnce([])  // pendingPayments
        .mockResolvedValueOnce([])  // overduePayments
        .mockResolvedValueOnce([]); // recentPayments
      mockPrisma.$queryRaw.mockResolvedValue([]);  // monthlyData

      const result = await service.getSupplierFinancialSummary('supplier-user-1');

      expect(result).toEqual({
        totalReceivable: 11000,
        totalReceived: 7000,
        totalPending: 3000,
        totalOverdue: 1000,
        pendingPayments: [],
        overduePayments: [],
        recentPayments: [],
        monthlyData: [],
      });
    });
  });
});
