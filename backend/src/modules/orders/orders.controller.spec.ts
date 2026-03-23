import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus, OrderAssignmentType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOrdersService = {
  create: jest.fn(),
  getMyOrders: jest.fn(),
  getById: jest.fn(),
  updateStatus: jest.fn(),
  accept: jest.fn(),
  reject: jest.fn(),
  getAllOrders: jest.fn(),
  getAvailableTransitions: jest.fn(),
  createReview: jest.fn(),
  getOrderReviews: jest.fn(),
  createChildOrder: jest.fn(),
  getOrderHierarchy: jest.fn(),
  addSecondQualityItems: jest.fn(),
  getSecondQualityItems: jest.fn(),
  getReviewStats: jest.fn(),
  getMonthlyStats: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // POST /orders (create)
  // =========================================================================

  describe('POST /orders', () => {
    const createDto = {
      assignmentType: OrderAssignmentType.DIRECT,
      supplierId: 'supplier-1',
      productType: 'Clothing',
      productCategory: 'T-Shirt',
      productName: 'Basic Tee',
      quantity: 100,
      pricePerUnit: 50,
      deliveryDeadline: '2026-03-01',
      paymentTerms: '30 days',
    };

    it('should create an order and return it', async () => {
      const createdOrder = {
        id: 'order-1',
        displayId: 'TX-20260313-ABCD',
        brandId: 'brand-1',
        status: OrderStatus.LANCADO_PELA_MARCA,
      };

      mockOrdersService.create.mockResolvedValue(createdOrder);

      const result = await controller.create(createDto, 'user-1');

      expect(result).toEqual(createdOrder);
      expect(mockOrdersService.create).toHaveBeenCalledWith(
        createDto,
        'user-1',
      );
    });

    it('should propagate ForbiddenException when user has no brand company', async () => {
      mockOrdersService.create.mockRejectedValue(
        new ForbiddenException(
          'You must have a brand company to create orders',
        ),
      );

      await expect(
        controller.create(createDto, 'supplier-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // GET /orders/brand
  // =========================================================================

  describe('GET /orders/brand', () => {
    it('should return brand orders for the user', async () => {
      const orders = [
        { id: 'order-1', brandId: 'brand-1', status: OrderStatus.LANCADO_PELA_MARCA },
        { id: 'order-2', brandId: 'brand-1', status: OrderStatus.EM_PRODUCAO },
      ];

      mockOrdersService.getMyOrders.mockResolvedValue(orders);

      const result = await controller.getBrandOrders('user-1');

      expect(result).toEqual(orders);
      expect(mockOrdersService.getMyOrders).toHaveBeenCalledWith(
        'user-1',
        'BRAND',
        undefined,
      );
    });

    it('should pass status filter to service when provided', async () => {
      mockOrdersService.getMyOrders.mockResolvedValue([]);

      await controller.getBrandOrders(
        'user-1',
        OrderStatus.EM_PRODUCAO,
      );

      expect(mockOrdersService.getMyOrders).toHaveBeenCalledWith(
        'user-1',
        'BRAND',
        OrderStatus.EM_PRODUCAO,
      );
    });
  });

  // =========================================================================
  // GET /orders/supplier
  // =========================================================================

  describe('GET /orders/supplier', () => {
    it('should return supplier orders for the user', async () => {
      const orders = [
        { id: 'order-3', supplierId: 'supplier-1', status: OrderStatus.EM_PRODUCAO },
      ];

      mockOrdersService.getMyOrders.mockResolvedValue(orders);

      const result = await controller.getSupplierOrders('user-2');

      expect(result).toEqual(orders);
      expect(mockOrdersService.getMyOrders).toHaveBeenCalledWith(
        'user-2',
        'SUPPLIER',
        undefined,
      );
    });
  });

  // =========================================================================
  // GET /orders/:id
  // =========================================================================

  describe('GET /orders/:id', () => {
    it('should return order details', async () => {
      const order = {
        id: 'order-1',
        displayId: 'TX-20260313-ABCD',
        status: OrderStatus.EM_PRODUCAO,
      };

      mockOrdersService.getById.mockResolvedValue(order);

      const result = await controller.getById('order-1', 'user-1');

      expect(result).toEqual(order);
      expect(mockOrdersService.getById).toHaveBeenCalledWith(
        'order-1',
        'user-1',
      );
    });

    it('should propagate NotFoundException for non-existent order', async () => {
      mockOrdersService.getById.mockRejectedValue(
        new NotFoundException('Pedido nao encontrado'),
      );

      await expect(
        controller.getById('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException for unauthorized access', async () => {
      mockOrdersService.getById.mockRejectedValue(
        new ForbiddenException('Acesso negado'),
      );

      await expect(
        controller.getById('order-1', 'unauthorized-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // PATCH /orders/:id/status
  // =========================================================================

  describe('PATCH /orders/:id/status', () => {
    it('should update order status', async () => {
      const updatedOrder = {
        id: 'order-1',
        status: OrderStatus.ACEITO_PELA_FACCAO,
      };

      mockOrdersService.updateStatus.mockResolvedValue(updatedOrder);

      const result = await controller.updateStatus('order-1', 'user-2', {
        status: OrderStatus.ACEITO_PELA_FACCAO,
      });

      expect(result.status).toBe(OrderStatus.ACEITO_PELA_FACCAO);
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
        'order-1',
        'user-2',
        { status: OrderStatus.ACEITO_PELA_FACCAO },
      );
    });

    it('should propagate BadRequestException for invalid status transition', async () => {
      mockOrdersService.updateStatus.mockRejectedValue(
        new BadRequestException('Invalid status transition'),
      );

      await expect(
        controller.updateStatus('order-1', 'user-1', {
          status: OrderStatus.EM_PRODUCAO,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // PATCH /orders/:id/accept
  // =========================================================================

  describe('PATCH /orders/:id/accept', () => {
    it('should accept an order', async () => {
      const acceptedOrder = {
        id: 'order-1',
        status: OrderStatus.ACEITO_PELA_FACCAO,
      };

      mockOrdersService.accept.mockResolvedValue(acceptedOrder);

      const result = await controller.accept('order-1', 'user-2');

      expect(result.status).toBe(OrderStatus.ACEITO_PELA_FACCAO);
      expect(mockOrdersService.accept).toHaveBeenCalledWith(
        'order-1',
        'user-2',
      );
    });
  });

  // =========================================================================
  // PATCH /orders/:id/reject
  // =========================================================================

  describe('PATCH /orders/:id/reject', () => {
    it('should reject an order with a reason', async () => {
      const rejectedOrder = {
        id: 'order-1',
        status: OrderStatus.DISPONIVEL_PARA_OUTRAS,
      };

      mockOrdersService.reject.mockResolvedValue(rejectedOrder);

      const result = await controller.reject('order-1', 'user-2', 'No capacity');

      expect(result).toEqual(rejectedOrder);
      expect(mockOrdersService.reject).toHaveBeenCalledWith(
        'order-1',
        'user-2',
        'No capacity',
      );
    });
  });

  // =========================================================================
  // GET /orders (admin)
  // =========================================================================

  describe('GET /orders (admin)', () => {
    it('should return all orders for admin', async () => {
      const allOrders = [
        { id: 'order-1' },
        { id: 'order-2' },
      ];

      mockOrdersService.getAllOrders.mockResolvedValue(allOrders);

      const result = await controller.getAllOrders();

      expect(result).toEqual(allOrders);
      expect(mockOrdersService.getAllOrders).toHaveBeenCalledWith(undefined);
    });

    it('should pass status filter to service', async () => {
      mockOrdersService.getAllOrders.mockResolvedValue([]);

      await controller.getAllOrders(OrderStatus.FINALIZADO);

      expect(mockOrdersService.getAllOrders).toHaveBeenCalledWith(
        OrderStatus.FINALIZADO,
      );
    });
  });
});
