import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

describe('RatingsService', () => {
  let service: RatingsService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    rating: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    company: {
      update: jest.fn(),
    },
    companyUser: {
      findMany: jest.fn(),
    },
  };

  const mockStorageProvider = {
    upload: jest.fn(),
    delete: jest.fn(),
    getUrl: jest.fn(),
    resolveUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: STORAGE_PROVIDER,
          useValue: mockStorageProvider,
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // create()
  // =========================================================================

  describe('create()', () => {
    const brandCompanyUser = { userId: 'user-brand', companyId: 'brand-1' };
    const supplierCompanyUser = {
      userId: 'user-supplier',
      companyId: 'supplier-1',
    };

    const mockFinalizedOrder = {
      id: 'order-1',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      status: OrderStatus.FINALIZADO,
      brand: {
        id: 'brand-1',
        companyUsers: [brandCompanyUser],
      },
      supplier: {
        id: 'supplier-1',
        companyUsers: [supplierCompanyUser],
      },
    };

    const mockRating = {
      id: 'rating-1',
      orderId: 'order-1',
      fromCompanyId: 'brand-1',
      toCompanyId: 'supplier-1',
      score: 4,
      comment: 'Bom trabalho',
    };

    const dto = { score: 4, comment: 'Bom trabalho' };

    it('deve criar rating após pedido em status FINALIZADO', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(mockRating);
      mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { score: 4 } });
      mockPrisma.company.update.mockResolvedValue({});

      const result = await service.create('order-1', 'user-brand', dto);

      expect(result).toEqual(mockRating);
      expect(mockPrisma.rating.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          fromCompanyId: 'brand-1',
          toCompanyId: 'supplier-1',
          score: 4,
          comment: 'Bom trabalho',
        }),
      });
    });

    it('deve lançar NotFoundException quando pedido não é encontrado', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent-order', 'user-brand', dto),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.create('nonexistent-order', 'user-brand', dto),
      ).rejects.toThrow('Pedido não encontrado');
    });

    it('deve lançar BadRequestException quando pedido não está em status FINALIZADO', async () => {
      const pendingOrder = {
        ...mockFinalizedOrder,
        status: OrderStatus.EM_PRODUCAO,
      };
      mockPrisma.order.findUnique.mockResolvedValue(pendingOrder);

      await expect(
        service.create('order-1', 'user-brand', dto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('order-1', 'user-brand', dto),
      ).rejects.toThrow('O pedido deve ser finalizado antes de avaliar');
    });

    it('deve lançar BadRequestException para todos os status que não são FINALIZADO', async () => {
      const nonFinalizedStatuses = [
        OrderStatus.LANCADO_PELA_MARCA,
        OrderStatus.ACEITO_PELA_FACCAO,
        OrderStatus.FILA_DE_PRODUCAO,
        OrderStatus.EM_PRODUCAO,
        OrderStatus.EM_REVISAO,
        OrderStatus.CANCELADO,
      ];

      for (const status of nonFinalizedStatuses) {
        mockPrisma.order.findUnique.mockResolvedValue({
          ...mockFinalizedOrder,
          status,
        });

        await expect(
          service.create('order-1', 'user-brand', dto),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('deve verificar que usuário da marca está relacionado ao pedido', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(mockRating);
      mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { score: 4 } });
      mockPrisma.company.update.mockResolvedValue({});

      const result = await service.create('order-1', 'user-brand', dto);

      expect(result).toBeDefined();
      // fromCompanyId deve ser da marca quando usuário pertence à marca
      expect(mockPrisma.rating.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromCompanyId: 'brand-1',
          toCompanyId: 'supplier-1',
        }),
      });
    });

    it('deve verificar que usuário da facção está relacionado ao pedido', async () => {
      const supplierRating = {
        ...mockRating,
        fromCompanyId: 'supplier-1',
        toCompanyId: 'brand-1',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(supplierRating);
      mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { score: 4 } });
      mockPrisma.company.update.mockResolvedValue({});

      const result = await service.create('order-1', 'user-supplier', dto);

      expect(result).toBeDefined();
      // fromCompanyId deve ser do fornecedor quando usuário pertence ao fornecedor
      expect(mockPrisma.rating.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromCompanyId: 'supplier-1',
          toCompanyId: 'brand-1',
        }),
      });
    });

    it('deve lançar ForbiddenException quando usuário não está relacionado ao pedido', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);

      await expect(
        service.create('order-1', 'user-unrelated', dto),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.create('order-1', 'user-unrelated', dto),
      ).rejects.toThrow('Você não tem acesso a este pedido');
    });

    it('deve impedir avaliação duplicada pelo mesmo usuário no mesmo pedido', async () => {
      const existingRating = {
        id: 'rating-existing',
        orderId: 'order-1',
        fromCompanyId: 'brand-1',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(existingRating);

      await expect(
        service.create('order-1', 'user-brand', dto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('order-1', 'user-brand', dto),
      ).rejects.toThrow('Você já avaliou este pedido');
    });

    it('deve verificar rating duplicado usando chave única orderId_fromCompanyId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(mockRating);
      mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { score: 4 } });
      mockPrisma.company.update.mockResolvedValue({});

      await service.create('order-1', 'user-brand', dto);

      expect(mockPrisma.rating.findUnique).toHaveBeenCalledWith({
        where: {
          orderId_fromCompanyId: {
            orderId: 'order-1',
            fromCompanyId: 'brand-1',
          },
        },
      });
    });

    it('deve chamar updateAverageRating após criar rating', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(mockRating);
      mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { score: 4.2 } });
      mockPrisma.company.update.mockResolvedValue({});

      await service.create('order-1', 'user-brand', dto);

      expect(mockPrisma.rating.aggregate).toHaveBeenCalledWith({
        where: { toCompanyId: 'supplier-1' },
        _avg: { score: true },
      });

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'supplier-1' },
        data: { avgRating: 4.2 },
      });
    });

    it('deve usar 0 como avgRating quando não há avaliações anteriores', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(mockRating);
      mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { score: null } });
      mockPrisma.company.update.mockResolvedValue({});

      await service.create('order-1', 'user-brand', dto);

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: 'supplier-1' },
        data: { avgRating: 0 },
      });
    });

    it('deve criar rating sem comentário opcional', async () => {
      const ratingWithoutComment = { ...mockRating, comment: undefined };

      mockPrisma.order.findUnique.mockResolvedValue(mockFinalizedOrder);
      mockPrisma.rating.findUnique.mockResolvedValue(null);
      mockPrisma.rating.create.mockResolvedValue(ratingWithoutComment);
      mockPrisma.rating.aggregate.mockResolvedValue({ _avg: { score: 4 } });
      mockPrisma.company.update.mockResolvedValue({});

      const result = await service.create('order-1', 'user-brand', {
        score: 4,
      });

      expect(result).toEqual(ratingWithoutComment);
      expect(mockPrisma.rating.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          score: 4,
          comment: undefined,
        }),
      });
    });
  });

  // =========================================================================
  // getCompanyRatings()
  // =========================================================================

  describe('getCompanyRatings()', () => {
    const mockRatingsList = [
      {
        id: 'rating-1',
        orderId: 'order-1',
        fromCompanyId: 'brand-1',
        toCompanyId: 'supplier-1',
        score: 5,
        comment: 'Excelente',
        createdAt: new Date('2026-01-10'),
        fromCompany: { id: 'brand-1', tradeName: 'Marca Teste' },
        order: {
          id: 'order-1',
          displayId: 'TX-2026-0001',
          productName: 'Camiseta',
        },
      },
      {
        id: 'rating-2',
        orderId: 'order-2',
        fromCompanyId: 'brand-2',
        toCompanyId: 'supplier-1',
        score: 3,
        comment: 'Regular',
        createdAt: new Date('2026-01-05'),
        fromCompany: { id: 'brand-2', tradeName: 'Outra Marca' },
        order: {
          id: 'order-2',
          displayId: 'TX-2026-0002',
          productName: 'Calça',
        },
      },
    ];

    it('deve retornar lista de ratings com média calculada para membro da empresa', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
      ]);
      mockPrisma.rating.findMany.mockResolvedValue(mockRatingsList);

      const result = await service.getCompanyRatings('supplier-1', 'user-supplier');

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockRatingsList);
      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { toCompanyId: 'supplier-1' },
          include: expect.objectContaining({
            fromCompany: expect.any(Object),
            order: expect.any(Object),
          }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('deve permitir acesso para empresa com relacionamento comercial existente', async () => {
      // Usuário pertence à 'brand-1', mas quer ver ratings da 'supplier-1'
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      // brand-1 não é supplier-1 — busca relacionamento comercial
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.rating.findMany.mockResolvedValue(mockRatingsList);

      const result = await service.getCompanyRatings('supplier-1', 'user-brand');

      expect(result).toHaveLength(2);
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ supplierId: 'supplier-1' }),
            ]),
          }),
        }),
      );
    });

    it('deve lançar ForbiddenException quando usuário não tem relação com a empresa', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-99' },
      ]);
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getCompanyRatings('supplier-1', 'user-unrelated'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve retornar ratings ordenados por data de criação decrescente', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
      ]);
      mockPrisma.rating.findMany.mockResolvedValue(mockRatingsList);

      await service.getCompanyRatings('supplier-1', 'user-supplier');

      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
    });

    it('deve incluir informações da empresa avaliadora e do pedido', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
      ]);
      mockPrisma.rating.findMany.mockResolvedValue(mockRatingsList);

      await service.getCompanyRatings('supplier-1', 'user-supplier');

      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            fromCompany: { select: { id: true, tradeName: true } },
            order: {
              select: { id: true, displayId: true, productName: true },
            },
          },
        }),
      );
    });
  });

  // =========================================================================
  // getReceivedRatings()
  // =========================================================================

  describe('getReceivedRatings()', () => {
    it('deve filtrar ratings pelo companyId do usuário', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
      ]);
      mockPrisma.rating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          toCompanyId: 'supplier-1',
          score: 5,
          fromCompany: { id: 'brand-1', tradeName: 'Marca A' },
          order: {
            id: 'order-1',
            displayId: 'TX-2026-0001',
            productName: 'Camiseta',
          },
        },
      ]);

      const result = await service.getReceivedRatings('user-supplier');

      expect(result).toHaveLength(1);
      expect(mockPrisma.companyUser.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-supplier' },
        select: { companyId: true },
      });
      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { toCompanyId: { in: ['supplier-1'] } },
        }),
      );
    });

    it('deve filtrar por múltiplos companyIds quando usuário pertence a mais de uma empresa', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
        { companyId: 'supplier-2' },
      ]);
      mockPrisma.rating.findMany.mockResolvedValue([]);

      await service.getReceivedRatings('user-multi-company');

      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { toCompanyId: { in: ['supplier-1', 'supplier-2'] } },
        }),
      );
    });

    it('deve retornar lista vazia quando usuário não tem empresas', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([]);
      mockPrisma.rating.findMany.mockResolvedValue([]);

      const result = await service.getReceivedRatings('user-no-company');

      expect(result).toEqual([]);
      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { toCompanyId: { in: [] } },
        }),
      );
    });

    it('deve retornar ratings ordenados por data de criação decrescente', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
      ]);
      mockPrisma.rating.findMany.mockResolvedValue([]);

      await service.getReceivedRatings('user-supplier');

      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
    });

    it('deve incluir informações da empresa avaliadora e do pedido', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
      ]);
      mockPrisma.rating.findMany.mockResolvedValue([]);

      await service.getReceivedRatings('user-supplier');

      expect(mockPrisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            fromCompany: { select: { id: true, tradeName: true } },
            order: {
              select: { id: true, displayId: true, productName: true },
            },
          },
        }),
      );
    });
  });

  // =========================================================================
  // getPendingRatings()
  // =========================================================================

  describe('getPendingRatings()', () => {
    const mockUpdatedAt = new Date('2026-01-15T10:00:00Z');

    const mockFinalizedOrders = [
      {
        id: 'order-1',
        displayId: 'TX-2026-0001',
        brandId: 'brand-1',
        supplierId: 'supplier-1',
        status: OrderStatus.FINALIZADO,
        updatedAt: mockUpdatedAt,
        brand: { id: 'brand-1', tradeName: 'Marca Teste', logoUrl: null },
        supplier: {
          id: 'supplier-1',
          tradeName: 'Facção Teste',
          logoUrl: 's3://bucket/logo.png',
        },
      },
    ];

    it('deve retornar pedidos FINALIZADO sem avaliação do usuário', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue(mockFinalizedOrders);
      mockStorageProvider.resolveUrl.mockResolvedValue(
        'https://cdn.example.com/logo.png',
      );

      const result = await service.getPendingRatings('user-brand');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        orderId: 'order-1',
        orderDisplayId: 'TX-2026-0001',
        partnerCompanyId: 'supplier-1',
        partnerName: 'Facção Teste',
        completedAt: mockUpdatedAt.toISOString(),
      });
    });

    it('deve buscar pedidos FINALIZADO onde empresa do usuário não avaliou', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getPendingRatings('user-brand');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.FINALIZADO,
            ratings: {
              none: {
                fromCompanyId: { in: ['brand-1'] },
              },
            },
          }),
        }),
      );
    });

    it('deve incluir pedidos onde empresa é marca ou fornecedor', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getPendingRatings('user-brand');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { brandId: { in: ['brand-1'] } },
              { supplierId: { in: ['brand-1'] } },
            ]),
          }),
        }),
      );
    });

    it('deve resolver URL do logo do parceiro via StorageProvider', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue(mockFinalizedOrders);
      mockStorageProvider.resolveUrl.mockResolvedValue(
        'https://cdn.example.com/presigned-logo.png',
      );

      const result = await service.getPendingRatings('user-brand');

      expect(mockStorageProvider.resolveUrl).toHaveBeenCalledWith(
        's3://bucket/logo.png',
      );
      expect(result[0].partnerImage).toBe(
        'https://cdn.example.com/presigned-logo.png',
      );
    });

    it('deve retornar partnerImage como undefined quando parceiro não tem logo', async () => {
      const ordersWithoutLogo = [
        {
          ...mockFinalizedOrders[0],
          supplier: {
            id: 'supplier-1',
            tradeName: 'Facção Sem Logo',
            logoUrl: null,
          },
        },
      ];

      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue(ordersWithoutLogo);

      const result = await service.getPendingRatings('user-brand');

      expect(mockStorageProvider.resolveUrl).not.toHaveBeenCalled();
      expect(result[0].partnerImage).toBeUndefined();
    });

    it('deve identificar parceiro como fornecedor quando usuário pertence à marca', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue(mockFinalizedOrders);
      mockStorageProvider.resolveUrl.mockResolvedValue(null);

      const result = await service.getPendingRatings('user-brand');

      // Usuário é da marca, então parceiro deve ser o fornecedor
      expect(result[0].partnerCompanyId).toBe('supplier-1');
      expect(result[0].partnerName).toBe('Facção Teste');
    });

    it('deve identificar parceiro como marca quando usuário pertence ao fornecedor', async () => {
      const ordersForSupplier = [
        {
          ...mockFinalizedOrders[0],
          brandId: 'brand-1',
          supplierId: 'supplier-1',
        },
      ];

      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'supplier-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue(ordersForSupplier);
      mockStorageProvider.resolveUrl.mockResolvedValue(null);

      const result = await service.getPendingRatings('user-supplier');

      // Usuário é do fornecedor, então parceiro deve ser a marca
      expect(result[0].partnerCompanyId).toBe('brand-1');
      expect(result[0].partnerName).toBe('Marca Teste');
    });

    it('deve retornar lista vazia quando não há pedidos pendentes de avaliação', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getPendingRatings('user-brand');

      expect(result).toEqual([]);
      expect(mockStorageProvider.resolveUrl).not.toHaveBeenCalled();
    });

    it('deve retornar completedAt como string ISO da data updatedAt do pedido', async () => {
      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue(mockFinalizedOrders);
      mockStorageProvider.resolveUrl.mockResolvedValue(null);

      const result = await service.getPendingRatings('user-brand');

      expect(result[0].completedAt).toBe(mockUpdatedAt.toISOString());
    });

    it('deve tratar parceiro nulo com valores padrão', async () => {
      const ordersWithNullSupplier = [
        {
          ...mockFinalizedOrders[0],
          supplierId: null,
          supplier: null,
        },
      ];

      mockPrisma.companyUser.findMany.mockResolvedValue([
        { companyId: 'brand-1' },
      ]);
      mockPrisma.order.findMany.mockResolvedValue(ordersWithNullSupplier);

      const result = await service.getPendingRatings('user-brand');

      expect(result[0].partnerCompanyId).toBe('');
      expect(result[0].partnerName).toBe('');
      expect(result[0].partnerImage).toBeUndefined();
    });
  });
});
