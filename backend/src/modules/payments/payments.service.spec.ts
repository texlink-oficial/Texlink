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

  // =========================================================================
  // create()
  // =========================================================================

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

    it('should allow any brand member to create a payment (second user)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.create('order-1', 'brand-user-2', mockCreateDto);

      expect(result).toEqual(mockPayment);
      expect(mockPrisma.payment.create).toHaveBeenCalled();
    });

    it('should create payment with only required fields (no method/notes)', async () => {
      const minimalDto = {
        amount: 1000,
        dueDate: '2026-06-01',
      };
      const minimalPayment = {
        id: 'payment-2',
        orderId: 'order-1',
        amount: 1000,
        dueDate: new Date('2026-06-01'),
        method: undefined,
        notes: undefined,
        status: PaymentStatus.PENDENTE,
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue(minimalPayment);

      const result = await service.create('order-1', 'brand-user-1', minimalDto);

      expect(result).toEqual(minimalPayment);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          amount: 1000,
          status: PaymentStatus.PENDENTE,
        }),
      });
    });

    it('should always set status to PENDENTE on creation', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      await service.create('order-1', 'brand-user-1', mockCreateDto);

      const createArg = mockPrisma.payment.create.mock.calls[0][0];
      expect(createArg.data.status).toBe(PaymentStatus.PENDENTE);
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

    it('should emit event exactly once per creation', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      await service.create('order-1', 'brand-user-1', mockCreateDto);

      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // update()
  // =========================================================================

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

    it('should update all three fields simultaneously', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.PAGO,
        paidDate: new Date('2026-03-10'),
        proofUrl: 'https://example.com/proof.pdf',
      };
      mockPrisma.payment.update.mockResolvedValue(updatedPayment);

      const result = await service.update('payment-1', 'brand-user-1', {
        status: PaymentStatus.PAGO,
        paidDate: '2026-03-10',
        proofUrl: 'https://example.com/proof.pdf',
      });

      expect(result).toEqual(updatedPayment);
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          status: PaymentStatus.PAGO,
          paidDate: new Date('2026-03-10'),
          proofUrl: 'https://example.com/proof.pdf',
        },
      });
    });

    it('should send empty data object when dto has no relevant fields', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue(mockPayment);

      await service.update('payment-1', 'brand-user-1', {});

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {},
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

    it('should convert payment.amount to Number in the event payload', async () => {
      // Prisma Decimal comes back as an object; the service uses Number()
      const paymentWithDecimal = {
        ...mockPayment,
        amount: { toNumber: () => 7500, toString: () => '7500' } as any,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(paymentWithDecimal);
      mockPrisma.payment.update.mockResolvedValue({
        ...paymentWithDecimal,
        status: PaymentStatus.PAGO,
      });

      await service.update('payment-1', 'brand-user-1', {
        status: PaymentStatus.PAGO,
      });

      const emittedEvent = mockEventEmitter.emit.mock.calls[0][1];
      expect(typeof emittedEvent.amount).toBe('number');
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

    it('should NOT emit event when only proofUrl is updated (no status change)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        proofUrl: 'https://example.com/receipt.pdf',
      });

      await service.update('payment-1', 'brand-user-1', {
        proofUrl: 'https://example.com/receipt.pdf',
      });

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getOrderPayments()
  // =========================================================================

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

    it('should return empty array when order has no payments', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getOrderPayments('order-1', 'brand-user-1');

      expect(result).toEqual([]);
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

    it('should query order with companyUsers select for userId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      await service.getOrderPayments('order-1', 'brand-user-1');

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          brand: { include: { companyUsers: { select: { userId: true } } } },
          supplier: { include: { companyUsers: { select: { userId: true } } } },
        },
      });
    });
  });

  // =========================================================================
  // getSupplierFinancialSummary()
  // =========================================================================

  describe('getSupplierFinancialSummary (Financial dashboard)', () => {
    const setupFinancialMocks = () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue({
        userId: 'supplier-user-1',
        companyId: 'supplier-1',
      });
    };

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

    it('should return correct financial totals', async () => {
      setupFinancialMocks();

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 3000 } })  // pendingAgg
        .mockResolvedValueOnce({ _sum: { amount: 7000 } })  // paidAgg
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })  // overdueAgg
        .mockResolvedValueOnce({ _sum: { amount: 11000 } }); // totalAgg
      mockPrisma.payment.findMany
        .mockResolvedValueOnce([])  // pendingPayments
        .mockResolvedValueOnce([])  // overduePayments
        .mockResolvedValueOnce([]); // recentPayments
      mockPrisma.$queryRaw.mockResolvedValue([]);

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

    it('should default to 0 when aggregate sums are null', async () => {
      setupFinancialMocks();

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })  // pendingAgg
        .mockResolvedValueOnce({ _sum: { amount: null } })  // paidAgg
        .mockResolvedValueOnce({ _sum: { amount: null } })  // overdueAgg
        .mockResolvedValueOnce({ _sum: { amount: null } }); // totalAgg
      mockPrisma.payment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getSupplierFinancialSummary('supplier-user-1');

      expect(result.totalReceivable).toBe(0);
      expect(result.totalReceived).toBe(0);
      expect(result.totalPending).toBe(0);
      expect(result.totalOverdue).toBe(0);
    });

    it('should map monthly data with correct month names', async () => {
      setupFinancialMocks();

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      mockPrisma.payment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Use mid-month dates to avoid timezone boundary issues
      // January = index 0, March = index 2
      mockPrisma.$queryRaw.mockResolvedValue([
        { month: new Date('2026-01-15T12:00:00Z'), received: 5000, pending: 2000 },
        { month: new Date('2026-03-15T12:00:00Z'), received: 3000, pending: 0 },
      ]);

      const result = await service.getSupplierFinancialSummary('supplier-user-1');

      expect(result.monthlyData).toEqual([
        { month: 'Jan', received: 5000, pending: 2000 },
        { month: 'Mar', received: 3000, pending: 0 },
      ]);
    });

    it('should pass through pending and overdue payment lists', async () => {
      setupFinancialMocks();

      const pendingList = [
        { id: 'p1', amount: 1000, dueDate: new Date('2026-04-01'), order: { displayId: 'TX-001', productName: 'T-Shirt', brand: { tradeName: 'BrandA' } } },
      ];
      const overdueList = [
        { id: 'p2', amount: 500, dueDate: new Date('2026-01-01'), order: { displayId: 'TX-002', productName: 'Jeans', brand: { tradeName: 'BrandB' } } },
      ];
      const recentList = [
        { id: 'p3', amount: 2000, paidDate: new Date('2026-02-01'), order: { displayId: 'TX-003', productName: 'Jacket', brand: { tradeName: 'BrandA' } } },
      ];

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 2000 } })
        .mockResolvedValueOnce({ _sum: { amount: 500 } })
        .mockResolvedValueOnce({ _sum: { amount: 3500 } });
      mockPrisma.payment.findMany
        .mockResolvedValueOnce(pendingList)
        .mockResolvedValueOnce(overdueList)
        .mockResolvedValueOnce(recentList);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getSupplierFinancialSummary('supplier-user-1');

      expect(result.pendingPayments).toEqual(pendingList);
      expect(result.overduePayments).toEqual(overdueList);
      expect(result.recentPayments).toEqual(recentList);
    });

    it('should filter aggregates by supplierId from companyUser lookup', async () => {
      setupFinancialMocks();

      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      mockPrisma.payment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.getSupplierFinancialSummary('supplier-user-1');

      // Verify the pending aggregate filters by supplierId and status
      expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith({
        where: {
          order: { supplierId: 'supplier-1' },
          status: PaymentStatus.PENDENTE,
        },
        _sum: { amount: true },
      });

      // Verify the paid aggregate
      expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith({
        where: {
          order: { supplierId: 'supplier-1' },
          status: PaymentStatus.PAGO,
        },
        _sum: { amount: true },
      });

      // Verify the overdue aggregate
      expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith({
        where: {
          order: { supplierId: 'supplier-1' },
          status: PaymentStatus.ATRASADO,
        },
        _sum: { amount: true },
      });

      // Verify the total aggregate (no status filter)
      expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith({
        where: {
          order: { supplierId: 'supplier-1' },
        },
        _sum: { amount: true },
      });
    });
  });
});
