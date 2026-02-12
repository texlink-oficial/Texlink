import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  OrderStatus,
  OrderAssignmentType,
  CompanyType,
  ReviewResult,
  OrderOrigin,
} from '@prisma/client';
import {
  ORDER_CREATED,
  ORDER_STATUS_CHANGED,
  ORDER_FINALIZED,
} from '../notifications/events/notification.events';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockStorage = {
    upload: jest.fn(),
    delete: jest.fn(),
    getUrl: jest.fn((key: string) => `http://localhost/uploads/${key}`),
    getPresignedUrl: jest.fn((key: string) => Promise.resolve(`http://localhost/uploads/${key}`)),
    resolveUrl: jest.fn((url: string | null) => Promise.resolve(url)),
  };

  const mockPrisma = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    companyUser: {
      findFirst: jest.fn(),
    },
    orderTargetSupplier: {
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    orderReview: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    secondQualityItem: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    credentialSettings: {
      findUnique: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: STORAGE_PROVIDER,
          useValue: mockStorage,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create (Order creation)', () => {
    const mockCompanyUser = {
      userId: 'user-1',
      companyId: 'brand-1',
      company: {
        id: 'brand-1',
        type: CompanyType.BRAND,
        tradeName: 'Test Brand',
      },
    };

    const mockOrder = {
      id: 'order-1',
      displayId: 'TX-20260207-ABCD',
      brandId: 'brand-1',
      status: OrderStatus.LANCADO_PELA_MARCA,
      assignmentType: OrderAssignmentType.DIRECT,
      productType: 'Clothing',
      productCategory: 'T-Shirt',
      productName: 'Basic Tee',
      quantity: 100,
      pricePerUnit: 50,
      totalValue: 5000,
      platformFee: 500,
      netValue: 4500,
      deliveryDeadline: new Date('2026-03-01'),
      brand: { id: 'brand-1', tradeName: 'Test Brand' },
      supplier: null,
      targetSuppliers: [],
      statusHistory: [],
    };

    it('should create a DIRECT order with required fields', async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(mockCompanyUser);
      mockPrisma.credentialSettings.findUnique.mockResolvedValue({
        defaultProtectTechnicalSheet: false,
      });
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(
        {
          assignmentType: OrderAssignmentType.DIRECT,
          supplierId: 'supplier-1',
          productType: 'Clothing',
          productCategory: 'T-Shirt',
          productName: 'Basic Tee',
          quantity: 100,
          pricePerUnit: 50,
          deliveryDeadline: '2026-03-01',
          paymentTerms: '30 days',
        },
        'user-1',
      );

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          brandId: 'brand-1',
          status: OrderStatus.LANCADO_PELA_MARCA,
          assignmentType: OrderAssignmentType.DIRECT,
          supplierId: 'supplier-1',
          quantity: 100,
          pricePerUnit: 50,
          totalValue: 5000,
          platformFee: 500,
          netValue: 4500,
        }),
        include: expect.any(Object),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_CREATED,
        expect.objectContaining({
          orderId: 'order-1',
          displayId: 'TX-20260207-ABCD',
          brandId: 'brand-1',
        }),
      );
    });

    it('should throw ForbiddenException when user has no brand company', async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            assignmentType: OrderAssignmentType.DIRECT,
            supplierId: 'supplier-1',
            productType: 'Clothing',
            productCategory: 'T-Shirt',
            productName: 'Basic Tee',
            quantity: 100,
            pricePerUnit: 50,
            deliveryDeadline: '2026-03-01',
            paymentTerms: '30 days',
          },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when DIRECT order has no supplierId', async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(mockCompanyUser);
      mockPrisma.credentialSettings.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            assignmentType: OrderAssignmentType.DIRECT,
            productType: 'Clothing',
            productCategory: 'T-Shirt',
            productName: 'Basic Tee',
            quantity: 100,
            pricePerUnit: 50,
            deliveryDeadline: '2026-03-01',
            paymentTerms: '30 days',
          },
          'user-1',
        ),
      ).rejects.toThrow(
        new BadRequestException('supplierId is required for DIRECT orders'),
      );
    });

    it('should throw BadRequestException when BIDDING order has no targetSupplierIds', async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(mockCompanyUser);
      mockPrisma.credentialSettings.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            assignmentType: OrderAssignmentType.BIDDING,
            productType: 'Clothing',
            productCategory: 'T-Shirt',
            productName: 'Basic Tee',
            quantity: 100,
            pricePerUnit: 50,
            deliveryDeadline: '2026-03-01',
            paymentTerms: '30 days',
          },
          'user-1',
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'targetSupplierIds is required for BIDDING orders',
        ),
      );
    });

    it('should create HYBRID orders with optional targetSupplierIds', async () => {
      const hybridOrder = {
        ...mockOrder,
        assignmentType: OrderAssignmentType.HYBRID,
        targetSuppliers: [
          { supplierId: 'supplier-1', status: 'PENDING' },
          { supplierId: 'supplier-2', status: 'PENDING' },
        ],
      };

      mockPrisma.companyUser.findFirst.mockResolvedValue(mockCompanyUser);
      mockPrisma.credentialSettings.findUnique.mockResolvedValue(null);
      mockPrisma.order.create.mockResolvedValue(hybridOrder);

      const result = await service.create(
        {
          assignmentType: OrderAssignmentType.HYBRID,
          targetSupplierIds: ['supplier-1', 'supplier-2'],
          productType: 'Clothing',
          productCategory: 'T-Shirt',
          productName: 'Basic Tee',
          quantity: 100,
          pricePerUnit: 50,
          deliveryDeadline: '2026-03-01',
          paymentTerms: '30 days',
        },
        'user-1',
      );

      expect(result.assignmentType).toBe(OrderAssignmentType.HYBRID);
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assignmentType: OrderAssignmentType.HYBRID,
          targetSuppliers: {
            createMany: {
              data: [
                { supplierId: 'supplier-1', status: 'PENDING' },
                { supplierId: 'supplier-2', status: 'PENDING' },
              ],
            },
          },
        }),
        include: expect.any(Object),
      });
    });

    it('should emit ORDER_CREATED event', async () => {
      mockPrisma.companyUser.findFirst.mockResolvedValue(mockCompanyUser);
      mockPrisma.credentialSettings.findUnique.mockResolvedValue(null);
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      await service.create(
        {
          assignmentType: OrderAssignmentType.DIRECT,
          supplierId: 'supplier-1',
          productType: 'Clothing',
          productCategory: 'T-Shirt',
          productName: 'Basic Tee',
          quantity: 100,
          pricePerUnit: 50,
          deliveryDeadline: '2026-03-01',
          paymentTerms: '30 days',
        },
        'user-1',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_CREATED,
        expect.objectContaining({
          orderId: 'order-1',
          displayId: 'TX-20260207-ABCD',
          brandId: 'brand-1',
          productName: 'Basic Tee',
          quantity: 100,
          totalValue: 5000,
        }),
      );
    });
  });

  describe('updateStatus (Status transitions)', () => {
    const mockOrder = {
      id: 'order-1',
      displayId: 'TX-20260207-ABCD',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      status: OrderStatus.LANCADO_PELA_MARCA,
      materialsProvided: true,
      brand: { id: 'brand-1', tradeName: 'Test Brand' },
      supplier: { id: 'supplier-1', tradeName: 'Test Supplier' },
      statusHistory: [],
    };

    const mockBrandUser = {
      userId: 'user-1',
      companyId: 'brand-1',
      company: { type: CompanyType.BRAND },
    };

    const mockSupplierUser = {
      userId: 'user-2',
      companyId: 'supplier-1',
      company: { type: CompanyType.SUPPLIER },
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
      });
    });

    it('should allow valid transition: LANCADO_PELA_MARCA to ACEITO_PELA_FACCAO (by supplier)', async () => {
      // Mock verifyOrderAccess dependencies
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(null) // Not brand
        .mockResolvedValueOnce(mockSupplierUser); // Is supplier

      const updatedOrder = {
        ...mockOrder,
        status: OrderStatus.ACEITO_PELA_FACCAO,
      };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-1', 'user-2', {
        status: OrderStatus.ACEITO_PELA_FACCAO,
      });

      expect(result.status).toBe(OrderStatus.ACEITO_PELA_FACCAO);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_STATUS_CHANGED,
        expect.objectContaining({
          orderId: 'order-1',
          previousStatus: OrderStatus.LANCADO_PELA_MARCA,
          newStatus: OrderStatus.ACEITO_PELA_FACCAO,
        }),
      );
    });

    it('should allow valid transition: ACEITO_PELA_FACCAO to EM_PREPARACAO_SAIDA_MARCA (by brand, materialsProvided=true)', async () => {
      const acceptedOrder = {
        ...mockOrder,
        status: OrderStatus.ACEITO_PELA_FACCAO,
        materialsProvided: true,
      };

      mockPrisma.order.findUnique.mockResolvedValue(acceptedOrder);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(mockBrandUser)
        .mockResolvedValueOnce(mockBrandUser);

      const updatedOrder = {
        ...acceptedOrder,
        status: OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
      };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-1', 'user-1', {
        status: OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
      });

      expect(result.status).toBe(OrderStatus.EM_PREPARACAO_SAIDA_MARCA);
    });

    it('should allow valid transition: ACEITO_PELA_FACCAO to FILA_DE_PRODUCAO (by supplier, materialsProvided=false)', async () => {
      const acceptedOrder = {
        ...mockOrder,
        status: OrderStatus.ACEITO_PELA_FACCAO,
        materialsProvided: false,
      };

      mockPrisma.order.findUnique.mockResolvedValue(acceptedOrder);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSupplierUser);

      const updatedOrder = {
        ...acceptedOrder,
        status: OrderStatus.FILA_DE_PRODUCAO,
      };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateStatus('order-1', 'user-2', {
        status: OrderStatus.FILA_DE_PRODUCAO,
      });

      expect(result.status).toBe(OrderStatus.FILA_DE_PRODUCAO);
    });

    it('should throw BadRequestException for invalid transition: LANCADO_PELA_MARCA to EM_PRODUCAO', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSupplierUser);

      await expect(
        service.updateStatus('order-1', 'user-2', {
          status: OrderStatus.EM_PRODUCAO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit ORDER_STATUS_CHANGED event', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSupplierUser);

      const updatedOrder = {
        ...mockOrder,
        status: OrderStatus.ACEITO_PELA_FACCAO,
      };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      await service.updateStatus('order-1', 'user-2', {
        status: OrderStatus.ACEITO_PELA_FACCAO,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_STATUS_CHANGED,
        expect.objectContaining({
          orderId: 'order-1',
          displayId: 'TX-20260207-ABCD',
          previousStatus: OrderStatus.LANCADO_PELA_MARCA,
          newStatus: OrderStatus.ACEITO_PELA_FACCAO,
          changedById: 'user-2',
          changedByName: 'Test User',
        }),
      );
    });

    it('should emit ORDER_FINALIZED for FINALIZADO status', async () => {
      const reviewOrder = {
        ...mockOrder,
        status: OrderStatus.EM_REVISAO,
      };

      mockPrisma.order.findUnique.mockResolvedValue(reviewOrder);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(mockBrandUser)
        .mockResolvedValueOnce(mockBrandUser);

      const finalizedOrder = {
        ...reviewOrder,
        status: OrderStatus.FINALIZADO,
      };
      mockPrisma.order.update.mockResolvedValue(finalizedOrder);

      await service.updateStatus('order-1', 'user-1', {
        status: OrderStatus.FINALIZADO,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        ORDER_FINALIZED,
        expect.objectContaining({
          orderId: 'order-1',
          newStatus: OrderStatus.FINALIZADO,
        }),
      );
    });
  });

  describe('updateStatus (Role-based permissions)', () => {
    const mockOrder = {
      id: 'order-1',
      displayId: 'TX-20260207-ABCD',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      status: OrderStatus.LANCADO_PELA_MARCA,
      materialsProvided: false,
    };

    it('should throw ForbiddenException when brand tries to accept order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.companyUser.findFirst.mockResolvedValue({
        userId: 'user-1',
        companyId: 'brand-1',
        company: { type: CompanyType.BRAND },
      });

      await expect(
        service.updateStatus('order-1', 'user-1', {
          status: OrderStatus.ACEITO_PELA_FACCAO,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when supplier tries to prepare materials', async () => {
      const acceptedOrder = {
        ...mockOrder,
        status: OrderStatus.ACEITO_PELA_FACCAO,
        materialsProvided: true,
      };

      mockPrisma.order.findUnique.mockResolvedValue(acceptedOrder);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          userId: 'user-2',
          companyId: 'supplier-1',
          company: { type: CompanyType.SUPPLIER },
        });

      await expect(
        service.updateStatus('order-1', 'user-2', {
          status: OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createReview (Order review)', () => {
    const mockOrder = {
      id: 'order-1',
      displayId: 'TX-20260207-ABCD',
      status: OrderStatus.EM_REVISAO,
      pricePerUnit: 50,
      quantity: 100,
    };

    const mockReview = {
      id: 'review-1',
      orderId: 'order-1',
      type: 'FINAL',
      result: ReviewResult.APPROVED,
      totalQuantity: 100,
      approvedQuantity: 100,
      rejectedQuantity: 0,
      secondQualityQuantity: 0,
      rejectedItems: [],
      reviewedBy: { id: 'user-1', name: 'Test User' },
    };

    it('should create review with all APPROVED quantities and set status to EM_PROCESSO_PAGAMENTO', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderReview.create.mockResolvedValue(mockReview);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.EM_PROCESSO_PAGAMENTO,
      });

      const result = await service.createReview('order-1', 'user-1', {
        type: 'FINAL_REVIEW',
        totalQuantity: 100,
        approvedQuantity: 100,
        rejectedQuantity: 0,
        secondQualityQuantity: 0,
      });

      expect(result.result).toBe(ReviewResult.APPROVED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({
            status: OrderStatus.EM_PROCESSO_PAGAMENTO,
          }),
        }),
      );
    });

    it('should create review with partial approved and set status to PARCIALMENTE_APROVADO', async () => {
      const partialReview = {
        ...mockReview,
        result: ReviewResult.PARTIAL,
        approvedQuantity: 70,
        rejectedQuantity: 20,
        secondQualityQuantity: 10,
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderReview.create.mockResolvedValue(partialReview);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PARCIALMENTE_APROVADO,
      });

      const result = await service.createReview('order-1', 'user-1', {
        type: 'FINAL_REVIEW',
        totalQuantity: 100,
        approvedQuantity: 70,
        rejectedQuantity: 20,
        secondQualityQuantity: 10,
      });

      expect(result.result).toBe(ReviewResult.PARTIAL);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: OrderStatus.PARCIALMENTE_APROVADO,
        }),
      });
    });

    it('should create review with all rejected and set status to REPROVADO', async () => {
      const rejectedReview = {
        ...mockReview,
        result: ReviewResult.REJECTED,
        approvedQuantity: 0,
        rejectedQuantity: 100,
        secondQualityQuantity: 0,
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderReview.create.mockResolvedValue(rejectedReview);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.REPROVADO,
      });

      const result = await service.createReview('order-1', 'user-1', {
        type: 'FINAL_REVIEW',
        totalQuantity: 100,
        approvedQuantity: 0,
        rejectedQuantity: 100,
        secondQualityQuantity: 0,
      });

      expect(result.result).toBe(ReviewResult.REJECTED);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: OrderStatus.REPROVADO,
        }),
      });
    });

    it('should throw BadRequestException when quantities do not sum to total', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.createReview('order-1', 'user-1', {
          type: 'FINAL_REVIEW',
          totalQuantity: 100,
          approvedQuantity: 50,
          rejectedQuantity: 30,
          secondQualityQuantity: 10, // Total = 90, not 100
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Sum of approved, rejected and second quality must equal total quantity',
        ),
      );
    });

    it('should create rejected items when provided', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderReview.create.mockResolvedValue({
        ...mockReview,
        rejectedQuantity: 20,
      });
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      await service.createReview('order-1', 'user-1', {
        type: 'FINAL_REVIEW',
        totalQuantity: 100,
        approvedQuantity: 80,
        rejectedQuantity: 20,
        secondQualityQuantity: 0,
        rejectedItems: [
          {
            reason: 'Defect',
            quantity: 20,
            defectDescription: 'Torn fabric',
            requiresRework: true,
          },
        ],
      });

      expect(mockPrisma.orderReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rejectedItems: {
            createMany: {
              data: [
                {
                  reason: 'Defect',
                  quantity: 20,
                  defectDescription: 'Torn fabric',
                  requiresRework: true,
                },
              ],
            },
          },
        }),
        include: expect.any(Object),
      });
    });

    it('should create second quality items when provided', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderReview.create.mockResolvedValue({
        ...mockReview,
        id: 'review-1',
        secondQualityQuantity: 10,
      });
      mockPrisma.secondQualityItem.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      await service.createReview('order-1', 'user-1', {
        type: 'FINAL_REVIEW',
        totalQuantity: 100,
        approvedQuantity: 90,
        rejectedQuantity: 0,
        secondQualityQuantity: 10,
        secondQualityItems: [
          {
            quantity: 10,
            defectType: 'Minor stain',
            defectDescription: 'Small stain on collar',
            discountPercentage: 20,
          },
        ],
      });

      expect(mockPrisma.secondQualityItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            orderId: 'order-1',
            reviewId: 'review-1',
            quantity: 10,
            defectType: 'Minor stain',
            defectDescription: 'Small stain on collar',
            originalUnitValue: 50,
            discountPercentage: 20,
          },
        ],
      });
    });
  });

  describe('createChildOrder (Child order / rework)', () => {
    const mockParentOrder = {
      id: 'order-1',
      displayId: 'TX-20260207-ABCD',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      status: OrderStatus.REPROVADO,
      assignmentType: OrderAssignmentType.DIRECT,
      productType: 'Clothing',
      productCategory: 'T-Shirt',
      productName: 'Basic Tee',
      pricePerUnit: 50,
      materialsProvided: true,
      revisionNumber: 0,
      childOrders: [],
    };

    it('should create child order with correct revision number', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockParentOrder);

      const childOrder = {
        id: 'order-2',
        displayId: 'TX-20260207-ABCD-R1',
        parentOrderId: 'order-1',
        revisionNumber: 1,
        status: OrderStatus.AGUARDANDO_RETRABALHO,
        origin: OrderOrigin.REWORK,
        brand: { id: 'brand-1', tradeName: 'Test Brand' },
        supplier: { id: 'supplier-1', tradeName: 'Test Supplier' },
        parentOrder: { id: 'order-1', displayId: 'TX-20260207-ABCD' },
      };

      mockPrisma.order.create.mockResolvedValue(childOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockParentOrder,
        status: OrderStatus.AGUARDANDO_RETRABALHO,
      });

      const result = await service.createChildOrder('order-1', 'user-1', {
        quantity: 20,
        deliveryDeadline: '2026-03-15',
        observations: 'Rework for defective items',
      });

      expect(result.revisionNumber).toBe(1);
      expect(result.parentOrderId).toBe('order-1');
      expect(result.status).toBe(OrderStatus.AGUARDANDO_RETRABALHO);
      expect(result.origin).toBe(OrderOrigin.REWORK);
    });

    it('should generate correct displayId (e.g., TX-20260207-ABCD-R1)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockParentOrder);

      const childOrder = {
        id: 'order-2',
        displayId: 'TX-20260207-ABCD-R1',
        revisionNumber: 1,
      };

      mockPrisma.order.create.mockResolvedValue(childOrder);
      mockPrisma.order.update.mockResolvedValue(mockParentOrder);

      const result = await service.createChildOrder('order-1', 'user-1', {
        quantity: 20,
      });

      expect(result.displayId).toBe('TX-20260207-ABCD-R1');
    });

    it('should update parent order status to AGUARDANDO_RETRABALHO', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockParentOrder);
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-2',
        displayId: 'TX-20260207-ABCD-R1',
      });
      mockPrisma.order.update.mockResolvedValue({
        ...mockParentOrder,
        status: OrderStatus.AGUARDANDO_RETRABALHO,
      });

      await service.createChildOrder('order-1', 'user-1', {
        quantity: 20,
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: OrderStatus.AGUARDANDO_RETRABALHO,
        }),
      });
    });

    it('should handle multiple revisions correctly', async () => {
      const parentWithChild = {
        ...mockParentOrder,
        childOrders: [{ revisionNumber: 1 }],
      };

      mockPrisma.order.findUnique.mockResolvedValue(parentWithChild);

      const secondChildOrder = {
        id: 'order-3',
        displayId: 'TX-20260207-ABCD-R2',
        revisionNumber: 2,
      };

      mockPrisma.order.create.mockResolvedValue(secondChildOrder);
      mockPrisma.order.update.mockResolvedValue(parentWithChild);

      const result = await service.createChildOrder('order-1', 'user-1', {
        quantity: 10,
      });

      expect(result.revisionNumber).toBe(2);
      expect(result.displayId).toBe('TX-20260207-ABCD-R2');
    });
  });

  describe('addSecondQualityItems (Second quality items)', () => {
    const mockOrder = {
      id: 'order-1',
      pricePerUnit: 50,
      secondQualityCount: 0,
    };

    it('should create items and increment secondQualityCount', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.secondQualityItem.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        secondQualityCount: 15,
      });

      const items = [
        {
          quantity: 10,
          defectType: 'Minor stain',
          defectDescription: 'Small stain',
          discountPercentage: 20,
        },
        {
          quantity: 5,
          defectType: 'Loose thread',
          discountPercentage: 10,
        },
      ];

      await service.addSecondQualityItems('order-1', 'user-1', items);

      expect(mockPrisma.secondQualityItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            orderId: 'order-1',
            quantity: 10,
            defectType: 'Minor stain',
            defectDescription: 'Small stain',
            originalUnitValue: 50,
            discountPercentage: 20,
          },
          {
            orderId: 'order-1',
            quantity: 5,
            defectType: 'Loose thread',
            defectDescription: undefined,
            originalUnitValue: 50,
            discountPercentage: 10,
          },
        ],
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { secondQualityCount: { increment: 15 } },
      });
    });
  });

  describe('getAvailableTransitions (Available transitions)', () => {
    it('should return correct transitions for brand with materialsProvided=true', async () => {
      const order = {
        id: 'order-1',
        status: OrderStatus.ACEITO_PELA_FACCAO,
        materialsProvided: true,
        brandId: 'brand-1',
        supplierId: 'supplier-1',
        brand: { companyUsers: [{ userId: 'user-1' }] },
        supplier: { companyUsers: [{ userId: 'user-2' }] },
        targetSuppliers: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.companyUser.findFirst.mockResolvedValue({
        userId: 'user-1',
        companyId: 'brand-1',
        company: { type: CompanyType.BRAND },
      });

      const result = await service.getAvailableTransitions('order-1', 'user-1');

      expect(result.canAdvance).toBe(true);
      // Brand gets: Preparar Insumos + Cancelar Pedido
      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0].nextStatus).toBe(
        OrderStatus.EM_PREPARACAO_SAIDA_MARCA,
      );
      expect(result.transitions[0].label).toBe('Preparar Insumos');
      expect(result.transitions[1].nextStatus).toBe(OrderStatus.CANCELADO);
    });

    it('should return correct transitions for supplier', async () => {
      const order = {
        id: 'order-1',
        status: OrderStatus.EM_PRODUCAO,
        materialsProvided: false,
        brandId: 'brand-1',
        supplierId: 'supplier-1',
        brand: { companyUsers: [{ userId: 'user-1' }] },
        supplier: { companyUsers: [{ userId: 'user-2' }] },
        targetSuppliers: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          userId: 'user-2',
          companyId: 'supplier-1',
          company: { type: CompanyType.SUPPLIER },
        });

      const result = await service.getAvailableTransitions('order-1', 'user-2');

      expect(result.canAdvance).toBe(true);
      // Supplier gets: Produção Concluída + Cancelar Pedido
      expect(result.transitions).toHaveLength(2);
      expect(result.transitions[0].nextStatus).toBe(OrderStatus.PRONTO);
      expect(result.transitions[0].label).toBe('Produção Concluída');
      expect(result.transitions[1].nextStatus).toBe(OrderStatus.CANCELADO);
    });

    it('should return empty transitions when it is not user turn', async () => {
      // Use EM_TRANSITO_PARA_MARCA status where only BRAND can act (Confirmar Recebimento)
      // Supplier has no transitions here — not even cancel
      const order = {
        id: 'order-1',
        status: OrderStatus.EM_TRANSITO_PARA_MARCA,
        materialsProvided: true,
        brandId: 'brand-1',
        supplierId: 'supplier-1',
        brand: { companyUsers: [{ userId: 'user-1' }] },
        supplier: { companyUsers: [{ userId: 'user-2' }] },
        targetSuppliers: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.companyUser.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          userId: 'user-2',
          companyId: 'supplier-1',
          company: { type: CompanyType.SUPPLIER },
        });

      const result = await service.getAvailableTransitions('order-1', 'user-2');

      expect(result.canAdvance).toBe(false);
      expect(result.transitions).toHaveLength(0);
      expect(result.waitingFor).toBe('BRAND');
      expect(result.waitingLabel).toBe('Aguardando a Marca confirmar recebimento');
    });
  });
});
