import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CompanyStatus, CompanyType, OrderStatus } from '@prisma/client';
import { SUPPLIER_STATUS_CHANGED } from '../notifications/events/notification.events';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  order: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  company: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  adminAction: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  companyUser: {
    create: jest.fn(),
  },
  supplierProfile: {
    create: jest.fn(),
  },
  brandProfile: {
    create: jest.fn(),
  },
  rating: {
    aggregate: jest.fn(),
  },
  supplierDocument: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
};

const mockStorageProvider = {
  resolveUrl: jest.fn(),
  getSignedUrl: jest.fn(),
  getPresignedUrl: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: STORAGE_PROVIDER, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // =========================================================================
  // getDashboard
  // =========================================================================

  describe('getDashboard()', () => {
    it('deve retornar métricas agregadas corretas', async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(100)  // totalOrders
        .mockResolvedValueOnce(30)   // activeOrders
        .mockResolvedValueOnce(50);  // completedOrders
      mockPrisma.company.count
        .mockResolvedValueOnce(20)   // totalSuppliers
        .mockResolvedValueOnce(15)   // activeSuppliers
        .mockResolvedValueOnce(3)    // pendingSuppliers
        .mockResolvedValueOnce(10);  // totalBrands
      mockPrisma.order.aggregate.mockResolvedValueOnce({
        _sum: { totalValue: 500000 },
      });
      mockPrisma.order.findMany.mockResolvedValueOnce([]);

      const result = await service.getDashboard();

      expect(result).toEqual(
        expect.objectContaining({
          metrics: expect.objectContaining({
            totalOrders: 100,
            activeOrders: 30,
            completedOrders: 50,
            totalSuppliers: 20,
            activeSuppliers: 15,
            pendingSuppliers: 3,
            totalBrands: 10,
            totalRevenue: 500000,
          }),
        }),
      );
    });

    it('deve retornar totalRevenue como 0 quando não há pedidos finalizados', async () => {
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.company.count.mockResolvedValue(0);
      mockPrisma.order.aggregate.mockResolvedValueOnce({
        _sum: { totalValue: null },
      });
      mockPrisma.order.findMany.mockResolvedValueOnce([]);

      const result = await service.getDashboard();

      expect(result.metrics.totalRevenue).toBe(0);
    });

    it('deve incluir os pedidos recentes no resultado', async () => {
      const recentOrders = [
        { id: 'order-1', brand: { tradeName: 'Marca A' }, supplier: { tradeName: 'Faccao B' } },
      ];

      mockPrisma.order.count.mockResolvedValue(1);
      mockPrisma.company.count.mockResolvedValue(0);
      mockPrisma.order.aggregate.mockResolvedValueOnce({ _sum: { totalValue: 0 } });
      mockPrisma.order.findMany.mockResolvedValueOnce(recentOrders);

      const result = await service.getDashboard();

      expect(result.recentOrders).toEqual(recentOrders);
    });
  });

  // =========================================================================
  // getPendingApprovals
  // =========================================================================

  describe('getPendingApprovals()', () => {
    it('deve retornar apenas empresas com status PENDING', async () => {
      const pendingCompanies = [
        {
          id: 'company-1',
          type: CompanyType.SUPPLIER,
          status: CompanyStatus.PENDING,
          supplierProfile: {},
          companyUsers: [],
          createdAt: new Date(),
        },
      ];

      mockPrisma.company.findMany.mockResolvedValueOnce(pendingCompanies);

      const result = await service.getPendingApprovals();

      expect(result).toEqual(pendingCompanies);
      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CompanyType.SUPPLIER,
            status: CompanyStatus.PENDING,
          }),
        }),
      );
    });

    it('deve retornar array vazio quando não há aprovações pendentes', async () => {
      mockPrisma.company.findMany.mockResolvedValueOnce([]);

      const result = await service.getPendingApprovals();

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // updateSupplierStatus
  // =========================================================================

  describe('updateSupplierStatus()', () => {
    const mockCompany = {
      status: CompanyStatus.PENDING,
      tradeName: 'Faccao Teste',
      legalName: 'Faccao Teste LTDA',
      companyUsers: [{ user: { id: 'user-1', name: 'Owner' } }],
    };

    const mockAdmin = { name: 'Admin User' };

    it('deve registrar log de ação com adminId e reason', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce(mockCompany);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.company.update.mockResolvedValueOnce({
        id: 'company-1',
        status: CompanyStatus.ACTIVE,
      });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      await service.updateSupplierStatus(
        'company-1',
        CompanyStatus.ACTIVE,
        'admin-1',
        'Documentação aprovada',
      );

      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            adminId: 'admin-1',
            action: 'ACTIVATED',
            reason: 'Documentação aprovada',
            previousStatus: CompanyStatus.PENDING,
            newStatus: CompanyStatus.ACTIVE,
          }),
        }),
      );
    });

    it('deve emitir evento SUPPLIER_STATUS_CHANGED', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce(mockCompany);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.ACTIVE });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      await service.updateSupplierStatus(
        'company-1',
        CompanyStatus.ACTIVE,
        'admin-1',
        'Aprovado',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        SUPPLIER_STATUS_CHANGED,
        expect.objectContaining({
          companyId: 'company-1',
          companyName: 'Faccao Teste',
          previousStatus: CompanyStatus.PENDING,
          newStatus: CompanyStatus.ACTIVE,
          adminId: 'admin-1',
          adminName: 'Admin User',
        }),
      );
    });

    it('deve registrar action SUSPENDED quando status é SUSPENDED', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce(mockCompany);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockAdmin);
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.SUSPENDED });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      await service.updateSupplierStatus(
        'company-1',
        CompanyStatus.SUSPENDED,
        'admin-1',
        'Irregularidades',
      );

      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SUSPENDED',
            newStatus: CompanyStatus.SUSPENDED,
          }),
        }),
      );
    });

    it('deve usar nome "Admin" como fallback quando admin não encontrado', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce(mockCompany);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.ACTIVE });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      await service.updateSupplierStatus('company-1', CompanyStatus.ACTIVE, 'admin-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        SUPPLIER_STATUS_CHANGED,
        expect.objectContaining({ adminName: 'Admin' }),
      );
    });
  });

  // =========================================================================
  // updateCompanyStatus
  // =========================================================================

  describe('updateCompanyStatus()', () => {
    it('deve aceitar o valor ACTIVE do enum CompanyStatus', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce({
        status: CompanyStatus.PENDING,
        tradeName: 'Empresa',
        legalName: 'Empresa LTDA',
        type: CompanyType.BRAND,
      });
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.ACTIVE });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      const result = await service.updateCompanyStatus('company-1', CompanyStatus.ACTIVE, 'admin-1');

      expect(mockPrisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CompanyStatus.ACTIVE }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ status: CompanyStatus.ACTIVE }));
    });

    it('deve aceitar o valor SUSPENDED do enum CompanyStatus', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce({
        status: CompanyStatus.ACTIVE,
        tradeName: 'Empresa',
        legalName: 'Empresa LTDA',
        type: CompanyType.SUPPLIER,
      });
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.SUSPENDED });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      const result = await service.updateCompanyStatus('company-1', CompanyStatus.SUSPENDED, 'admin-1', 'Irregularidade');

      expect(mockPrisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CompanyStatus.SUSPENDED }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ status: CompanyStatus.SUSPENDED }));
    });

    it('deve aceitar o valor PENDING do enum CompanyStatus', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce({
        status: CompanyStatus.ACTIVE,
        tradeName: 'Empresa',
        legalName: 'Empresa LTDA',
        type: CompanyType.SUPPLIER,
      });
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.PENDING });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      const result = await service.updateCompanyStatus('company-1', CompanyStatus.PENDING, 'admin-1');

      expect(result).toEqual(expect.objectContaining({ status: CompanyStatus.PENDING }));
    });

    it('deve criar adminAction com previousStatus e newStatus', async () => {
      mockPrisma.company.findUniqueOrThrow.mockResolvedValueOnce({
        status: CompanyStatus.PENDING,
        tradeName: 'Empresa',
        legalName: 'Empresa LTDA',
        type: CompanyType.SUPPLIER,
      });
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.ACTIVE });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      await service.updateCompanyStatus('company-1', CompanyStatus.ACTIVE, 'admin-1', 'Motivo');

      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousStatus: CompanyStatus.PENDING,
            newStatus: CompanyStatus.ACTIVE,
            reason: 'Motivo',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // deleteCompany
  // =========================================================================

  describe('deleteCompany()', () => {
    it('deve realizar soft delete (status SUSPENDED) quando empresa existe', async () => {
      const existingCompany = {
        id: 'company-1',
        status: CompanyStatus.ACTIVE,
      };

      mockPrisma.company.findUnique.mockResolvedValueOnce(existingCompany);
      mockPrisma.company.update.mockResolvedValueOnce({
        id: 'company-1',
        status: CompanyStatus.SUSPENDED,
      });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      const result = await service.deleteCompany('company-1', 'admin-1');

      expect(mockPrisma.company.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'company-1' },
          data: expect.objectContaining({
            status: CompanyStatus.SUSPENDED,
            statusReason: 'Excluída pelo administrador',
          }),
        }),
      );
      expect(result).toEqual({ success: true, message: 'Empresa excluída com sucesso' });
    });

    it('deve lançar NotFoundException quando empresa não existe', async () => {
      mockPrisma.company.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deleteCompany('nonexistent-id', 'admin-1'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.deleteCompany('nonexistent-id', 'admin-1'),
      ).rejects.toThrow('Empresa não encontrada');
    });

    it('deve registrar adminAction com action DELETED', async () => {
      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: 'company-1',
        status: CompanyStatus.ACTIVE,
      });
      mockPrisma.company.update.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.SUSPENDED });
      mockPrisma.adminAction.create.mockResolvedValueOnce({});

      await service.deleteCompany('company-1', 'admin-1');

      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            adminId: 'admin-1',
            action: 'DELETED',
            newStatus: CompanyStatus.SUSPENDED,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // registerCompany
  // =========================================================================

  describe('registerCompany()', () => {
    const registerDto = {
      email: 'owner@empresa.com',
      password: 'Senha123',
      userName: 'Owner Name',
      legalName: 'Empresa LTDA',
      tradeName: 'Empresa',
      document: '12.345.678/0001-90',
      type: CompanyType.SUPPLIER,
      city: 'São Paulo',
      state: 'SP',
      productTypes: ['Camisetas'],
    };

    it('deve criar empresa e usuário owner em transação', async () => {
      const createdUser = { id: 'user-new', email: 'owner@empresa.com', name: 'Owner Name' };
      const createdCompany = { id: 'company-new', legalName: 'Empresa LTDA' };

      mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(createdUser),
          },
          company: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(createdCompany),
          },
          companyUser: {
            create: jest.fn().mockResolvedValue({}),
          },
          supplierProfile: {
            create: jest.fn().mockResolvedValue({}),
          },
          adminAction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: 'company-new',
        supplierProfile: {},
        brandProfile: null,
        companyUsers: [{ user: createdUser }],
      });

      const result = await service.registerCompany(registerDto, 'admin-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('deve lançar ConflictException quando e-mail já existe', async () => {
      mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
          },
          company: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        service.registerCompany(registerDto, 'admin-1'),
      ).rejects.toThrow('Já existe um usuário com este e-mail');
    });

    it('deve lançar ConflictException quando CNPJ já existe', async () => {
      mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          company: {
            findUnique: jest.fn().mockResolvedValue({ id: 'existing-company' }),
          },
        };
        return callback(tx);
      });

      await expect(
        service.registerCompany(registerDto, 'admin-1'),
      ).rejects.toThrow('Já existe uma empresa com este CNPJ');
    });

    it('deve criar supplierProfile quando type é SUPPLIER', async () => {
      const supplierCreateMock = jest.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'user-new' }),
          },
          company: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'company-new' }),
          },
          companyUser: {
            create: jest.fn().mockResolvedValue({}),
          },
          supplierProfile: {
            create: supplierCreateMock,
          },
          adminAction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: 'company-new',
        supplierProfile: {},
        brandProfile: null,
        companyUsers: [],
      });

      await service.registerCompany({ ...registerDto, type: CompanyType.SUPPLIER }, 'admin-1');

      expect(supplierCreateMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // getSuppliers
  // =========================================================================

  describe('getSuppliers()', () => {
    it('deve suportar paginação', async () => {
      mockPrisma.company.findMany.mockResolvedValueOnce([]);
      mockPrisma.company.count.mockResolvedValueOnce(0);

      const result = await service.getSuppliers(undefined, 2, 10);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ page: 2, totalPages: 0 }),
      );
    });

    it('deve filtrar por status quando fornecido', async () => {
      mockPrisma.company.findMany.mockResolvedValueOnce([]);
      mockPrisma.company.count.mockResolvedValueOnce(0);

      await service.getSuppliers(CompanyStatus.ACTIVE);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CompanyType.SUPPLIER,
            status: CompanyStatus.ACTIVE,
          }),
        }),
      );
    });

    it('deve retornar todos os fornecedores quando status não é informado', async () => {
      mockPrisma.company.findMany.mockResolvedValueOnce([]);
      mockPrisma.company.count.mockResolvedValueOnce(0);

      await service.getSuppliers(undefined);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CompanyType.SUPPLIER,
          }),
        }),
      );
    });

    it('deve retornar estrutura de paginação com total e totalPages', async () => {
      const companies = [{ id: 'c1' }, { id: 'c2' }];
      mockPrisma.company.findMany.mockResolvedValueOnce(companies);
      mockPrisma.company.count.mockResolvedValueOnce(20);

      const result = await service.getSuppliers(undefined, 1, 10);

      expect(result).toEqual(
        expect.objectContaining({
          data: companies,
          total: 20,
          page: 1,
          totalPages: 2,
        }),
      );
    });
  });

  // =========================================================================
  // getBrands
  // =========================================================================

  describe('getBrands()', () => {
    it('deve suportar paginação', async () => {
      mockPrisma.company.findMany.mockResolvedValueOnce([]);
      mockPrisma.company.count.mockResolvedValueOnce(0);

      const result = await service.getBrands(undefined, 3, 5);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ page: 3 }));
    });

    it('deve filtrar por status quando fornecido', async () => {
      mockPrisma.company.findMany.mockResolvedValueOnce([]);
      mockPrisma.company.count.mockResolvedValueOnce(0);

      await service.getBrands(CompanyStatus.SUSPENDED);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CompanyType.BRAND,
            status: CompanyStatus.SUSPENDED,
          }),
        }),
      );
    });

    it('deve retornar todas as marcas quando status não é informado', async () => {
      mockPrisma.company.findMany.mockResolvedValueOnce([]);
      mockPrisma.company.count.mockResolvedValueOnce(0);

      await service.getBrands();

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CompanyType.BRAND,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // getOrders
  // =========================================================================

  describe('getOrders()', () => {
    it('deve retornar todos os pedidos sem filtro de tenant', async () => {
      const allOrders = [
        { id: 'order-1', brandId: 'brand-1', supplierId: 'supplier-1' },
        { id: 'order-2', brandId: 'brand-2', supplierId: 'supplier-2' },
      ];
      mockPrisma.order.findMany.mockResolvedValueOnce(allOrders);
      mockPrisma.order.count.mockResolvedValueOnce(2);

      const result = await service.getOrders();

      expect(result.data).toEqual(allOrders);
      expect(result.total).toBe(2);
      // Confirma que não há filtro de companyId na query
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
        }),
      );
    });

    it('deve filtrar por status quando fornecido', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      mockPrisma.order.count.mockResolvedValueOnce(0);

      await service.getOrders(OrderStatus.FINALIZADO);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrderStatus.FINALIZADO },
        }),
      );
    });

    it('deve suportar paginação', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      mockPrisma.order.count.mockResolvedValueOnce(50);

      const result = await service.getOrders(undefined, 2, 10);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ page: 2, total: 50, totalPages: 5 }),
      );
    });
  });

  // =========================================================================
  // getRevenueHistory
  // =========================================================================

  describe('getRevenueHistory()', () => {
    it('deve retornar array com o número de entradas igual ao parâmetro months', async () => {
      const rawData = [
        { month: new Date('2026-01-01'), revenue: 10000, orders: 5, previousRevenue: 8000 },
        { month: new Date('2026-02-01'), revenue: 12000, orders: 7, previousRevenue: 10000 },
        { month: new Date('2026-03-01'), revenue: 15000, orders: 9, previousRevenue: 12000 },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(rawData);

      const result = await service.getRevenueHistory(3);

      expect(result).toHaveLength(3);
    });

    it('deve retornar campos month, revenue, previousRevenue, orders e growth', async () => {
      const rawData = [
        { month: new Date('2026-03-01'), revenue: 15000, orders: 9, previousRevenue: 12000 },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(rawData);

      const result = await service.getRevenueHistory(1);

      expect(result[0]).toEqual(
        expect.objectContaining({
          month: expect.any(String),
          fullMonth: expect.any(String),
          revenue: expect.any(Number),
          previousRevenue: expect.any(Number),
          orders: expect.any(Number),
          growth: expect.any(Number),
        }),
      );
    });

    it('deve calcular growth corretamente quando previousRevenue > 0', async () => {
      const rawData = [
        { month: new Date('2026-03-01'), revenue: 11000, orders: 5, previousRevenue: 10000 },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(rawData);

      const result = await service.getRevenueHistory(1);

      expect(result[0].growth).toBe(10);
    });

    it('deve retornar growth 0 quando previousRevenue é 0', async () => {
      const rawData = [
        { month: new Date('2026-03-01'), revenue: 5000, orders: 3, previousRevenue: 0 },
      ];

      mockPrisma.$queryRaw.mockResolvedValueOnce(rawData);

      const result = await service.getRevenueHistory(1);

      expect(result[0].growth).toBe(0);
    });

    it('deve retornar array vazio quando não há dados de receita', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getRevenueHistory(6);

      expect(result).toEqual([]);
    });
  });
});
