import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyStatus, CompanyType, OrderStatus, UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAdminService = {
  getDashboard: jest.fn(),
  getPendingApprovals: jest.fn(),
  updateSupplierStatus: jest.fn(),
  getAdminActions: jest.fn(),
  getSuppliers: jest.fn(),
  getBrands: jest.fn(),
  getOrders: jest.fn(),
  getAllDocuments: jest.fn(),
  getDocumentsStats: jest.fn(),
  getDocumentDownloadUrl: jest.fn(),
  getSupplierDocuments: jest.fn(),
  updateDocumentExpiry: jest.fn(),
  getRevenueHistory: jest.fn(),
  getOrdersMonthlyStats: jest.fn(),
  registerCompany: jest.fn(),
  getCompanyDetails: jest.fn(),
  createCompany: jest.fn(),
  updateCompany: jest.fn(),
  updateCompanyStatus: jest.fn(),
  deleteCompany: jest.fn(),
  addUserToCompany: jest.fn(),
  removeUserFromCompany: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helper: get metadata from controller class or handler
// ---------------------------------------------------------------------------

function getGuardsMetadata(target: any): any[] {
  return Reflect.getMetadata('__guards__', target) || [];
}

function getRolesMetadata(target: any, methodKey?: string): UserRole[] {
  if (methodKey) {
    return Reflect.getMetadata(ROLES_KEY, target, methodKey) || [];
  }
  return Reflect.getMetadata(ROLES_KEY, target) || [];
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Guard and Role decorators (class-level)
  // =========================================================================

  describe('Segurança — decoradores de guarda e role na classe', () => {
    it('deve aplicar JwtAuthGuard na classe AdminController', () => {
      const guards = getGuardsMetadata(AdminController);
      const guardNames = guards.map((g: any) => g?.name || g?.constructor?.name || String(g));
      expect(guardNames).toContain('JwtAuthGuard');
    });

    it('deve aplicar RolesGuard na classe AdminController', () => {
      const guards = getGuardsMetadata(AdminController);
      const guardNames = guards.map((g: any) => g?.name || g?.constructor?.name || String(g));
      expect(guardNames).toContain('RolesGuard');
    });

    it('deve exigir role ADMIN na classe AdminController', () => {
      const roles = getRolesMetadata(AdminController);
      expect(roles).toContain(UserRole.ADMIN);
    });
  });

  // =========================================================================
  // GET /admin/dashboard
  // =========================================================================

  describe('GET /admin/dashboard', () => {
    it('deve retornar os dados do dashboard', async () => {
      const dashboardData = {
        metrics: {
          totalOrders: 100,
          activeOrders: 30,
          totalSuppliers: 20,
          activeSuppliers: 15,
          pendingSuppliers: 3,
          totalBrands: 10,
          totalRevenue: 500000,
        },
        recentOrders: [],
      };

      mockAdminService.getDashboard.mockResolvedValueOnce(dashboardData);

      const result = await controller.getDashboard();

      expect(result).toEqual(dashboardData);
      expect(mockAdminService.getDashboard).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // GET /admin/approvals
  // =========================================================================

  describe('GET /admin/approvals', () => {
    it('deve retornar aprovações pendentes', async () => {
      const pendingList = [
        { id: 'company-1', status: CompanyStatus.PENDING, type: CompanyType.SUPPLIER },
      ];

      mockAdminService.getPendingApprovals.mockResolvedValueOnce(pendingList);

      const result = await controller.getPendingApprovals();

      expect(result).toEqual(pendingList);
      expect(mockAdminService.getPendingApprovals).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // PATCH /admin/suppliers/:id/status
  // =========================================================================

  describe('PATCH /admin/suppliers/:id/status', () => {
    it('deve aceitar status ACTIVE do CompanyStatus', async () => {
      const updatedCompany = { id: 'company-1', status: CompanyStatus.ACTIVE };
      mockAdminService.updateSupplierStatus.mockResolvedValueOnce(updatedCompany);

      const user = { id: 'admin-1', role: UserRole.ADMIN };
      const result = await controller.updateSupplierStatus(
        'company-1',
        CompanyStatus.ACTIVE,
        'Documentação válida',
        user,
      );

      expect(result).toEqual(updatedCompany);
      expect(mockAdminService.updateSupplierStatus).toHaveBeenCalledWith(
        'company-1',
        CompanyStatus.ACTIVE,
        'admin-1',
        'Documentação válida',
      );
    });

    it('deve aceitar status SUSPENDED do CompanyStatus', async () => {
      const updatedCompany = { id: 'company-1', status: CompanyStatus.SUSPENDED };
      mockAdminService.updateSupplierStatus.mockResolvedValueOnce(updatedCompany);

      const user = { id: 'admin-1', role: UserRole.ADMIN };
      const result = await controller.updateSupplierStatus(
        'company-1',
        CompanyStatus.SUSPENDED,
        'Irregularidades',
        user,
      );

      expect(result).toEqual(updatedCompany);
      expect(mockAdminService.updateSupplierStatus).toHaveBeenCalledWith(
        'company-1',
        CompanyStatus.SUSPENDED,
        'admin-1',
        'Irregularidades',
      );
    });

    it('deve delegar adminId a partir do usuário autenticado', async () => {
      mockAdminService.updateSupplierStatus.mockResolvedValueOnce({});

      const user = { id: 'admin-user-id', role: UserRole.ADMIN };
      await controller.updateSupplierStatus('company-1', CompanyStatus.ACTIVE, '', user);

      expect(mockAdminService.updateSupplierStatus).toHaveBeenCalledWith(
        'company-1',
        CompanyStatus.ACTIVE,
        'admin-user-id',
        '',
      );
    });
  });

  // =========================================================================
  // GET /admin/suppliers
  // =========================================================================

  describe('GET /admin/suppliers', () => {
    it('deve retornar lista paginada de fornecedores', async () => {
      const suppliersResult = {
        data: [{ id: 'supplier-1', type: CompanyType.SUPPLIER }],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockAdminService.getSuppliers.mockResolvedValueOnce(suppliersResult);

      const result = await controller.getSuppliers(undefined, undefined, undefined);

      expect(result).toEqual(suppliersResult);
      expect(mockAdminService.getSuppliers).toHaveBeenCalledWith(undefined, 1, 50);
    });

    it('deve passar status e paginação para o service', async () => {
      mockAdminService.getSuppliers.mockResolvedValueOnce({ data: [], total: 0, page: 2, totalPages: 0 });

      await controller.getSuppliers(CompanyStatus.ACTIVE, '2', '20');

      expect(mockAdminService.getSuppliers).toHaveBeenCalledWith(CompanyStatus.ACTIVE, 2, 20);
    });
  });

  // =========================================================================
  // GET /admin/brands
  // =========================================================================

  describe('GET /admin/brands', () => {
    it('deve retornar lista paginada de marcas', async () => {
      const brandsResult = {
        data: [{ id: 'brand-1', type: CompanyType.BRAND }],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockAdminService.getBrands.mockResolvedValueOnce(brandsResult);

      const result = await controller.getBrands(undefined, undefined, undefined);

      expect(result).toEqual(brandsResult);
      expect(mockAdminService.getBrands).toHaveBeenCalledWith(undefined, 1, 50);
    });

    it('deve passar status e paginação para o service', async () => {
      mockAdminService.getBrands.mockResolvedValueOnce({ data: [], total: 0, page: 1, totalPages: 0 });

      await controller.getBrands(CompanyStatus.SUSPENDED, '1', '10');

      expect(mockAdminService.getBrands).toHaveBeenCalledWith(CompanyStatus.SUSPENDED, 1, 10);
    });
  });

  // =========================================================================
  // GET /admin/orders
  // =========================================================================

  describe('GET /admin/orders', () => {
    it('deve retornar todos os pedidos', async () => {
      const ordersResult = {
        data: [{ id: 'order-1' }, { id: 'order-2' }],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockAdminService.getOrders.mockResolvedValueOnce(ordersResult);

      const result = await controller.getOrders(undefined, undefined, undefined);

      expect(result).toEqual(ordersResult);
      expect(mockAdminService.getOrders).toHaveBeenCalledWith(undefined, 1, 50);
    });

    it('deve passar filtro de status para o service', async () => {
      mockAdminService.getOrders.mockResolvedValueOnce({ data: [], total: 0, page: 1, totalPages: 0 });

      await controller.getOrders(OrderStatus.FINALIZADO, undefined, undefined);

      expect(mockAdminService.getOrders).toHaveBeenCalledWith(OrderStatus.FINALIZADO, 1, 50);
    });
  });

  // =========================================================================
  // DELETE /admin/companies/:id
  // =========================================================================

  describe('DELETE /admin/companies/:id', () => {
    it('deve retornar sucesso quando a empresa é excluída', async () => {
      const deleteResult = { success: true, message: 'Empresa excluída com sucesso' };
      mockAdminService.deleteCompany.mockResolvedValueOnce(deleteResult);

      const user = { id: 'admin-1', role: UserRole.ADMIN };
      const result = await controller.deleteCompany('company-1', user);

      expect(result).toEqual(deleteResult);
      expect(result.success).toBe(true);
    });

    it('deve propagar NotFoundException quando empresa não existe', async () => {
      mockAdminService.deleteCompany.mockRejectedValueOnce(
        new NotFoundException('Empresa não encontrada'),
      );

      const user = { id: 'admin-1', role: UserRole.ADMIN };

      await expect(
        controller.deleteCompany('nonexistent-id', user),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve delegar adminId a partir do usuário autenticado', async () => {
      mockAdminService.deleteCompany.mockResolvedValueOnce({ success: true, message: 'Empresa excluída com sucesso' });

      const user = { id: 'admin-user-id', role: UserRole.ADMIN };
      await controller.deleteCompany('company-1', user);

      expect(mockAdminService.deleteCompany).toHaveBeenCalledWith('company-1', 'admin-user-id');
    });
  });

  // =========================================================================
  // PATCH /admin/companies/:id/status
  // =========================================================================

  describe('PATCH /admin/companies/:id/status', () => {
    it('deve atualizar status da empresa e retornar resultado do service', async () => {
      const updatedCompany = { id: 'company-1', status: CompanyStatus.ACTIVE };
      mockAdminService.updateCompanyStatus.mockResolvedValueOnce(updatedCompany);

      const user = { id: 'admin-1', role: UserRole.ADMIN };
      const result = await controller.updateCompanyStatus(
        'company-1',
        CompanyStatus.ACTIVE,
        'Aprovado',
        user,
      );

      expect(result).toEqual(updatedCompany);
      expect(mockAdminService.updateCompanyStatus).toHaveBeenCalledWith(
        'company-1',
        CompanyStatus.ACTIVE,
        'admin-1',
        'Aprovado',
      );
    });

    it('deve aceitar CompanyStatus.PENDING', async () => {
      mockAdminService.updateCompanyStatus.mockResolvedValueOnce({ id: 'company-1', status: CompanyStatus.PENDING });

      const user = { id: 'admin-1', role: UserRole.ADMIN };
      await controller.updateCompanyStatus('company-1', CompanyStatus.PENDING, '', user);

      expect(mockAdminService.updateCompanyStatus).toHaveBeenCalledWith(
        'company-1',
        CompanyStatus.PENDING,
        'admin-1',
        '',
      );
    });
  });

  // =========================================================================
  // GET /admin/dashboard/revenue-history
  // =========================================================================

  describe('GET /admin/dashboard/revenue-history', () => {
    it('deve retornar histórico de receita com parâmetro padrão de 6 meses', async () => {
      const revenueData = [
        { month: 'Jan', revenue: 10000, previousRevenue: 8000, orders: 5, growth: 25 },
      ];

      mockAdminService.getRevenueHistory.mockResolvedValueOnce(revenueData);

      const result = await controller.getRevenueHistory(undefined);

      expect(result).toEqual(revenueData);
      expect(mockAdminService.getRevenueHistory).toHaveBeenCalledWith(6);
    });

    it('deve passar o parâmetro months convertido para número', async () => {
      mockAdminService.getRevenueHistory.mockResolvedValueOnce([]);

      await controller.getRevenueHistory('12');

      expect(mockAdminService.getRevenueHistory).toHaveBeenCalledWith(12);
    });
  });

  // =========================================================================
  // POST /admin/register-company
  // =========================================================================

  describe('POST /admin/register-company', () => {
    it('deve registrar empresa e usuário owner', async () => {
      const registeredCompany = {
        id: 'company-new',
        legalName: 'Nova Empresa LTDA',
        type: CompanyType.SUPPLIER,
        status: CompanyStatus.ACTIVE,
        companyUsers: [],
      };

      mockAdminService.registerCompany.mockResolvedValueOnce(registeredCompany);

      const dto = {
        email: 'owner@empresa.com',
        password: 'Senha123',
        userName: 'Owner',
        legalName: 'Nova Empresa LTDA',
        document: '12.345.678/0001-90',
        type: CompanyType.SUPPLIER,
        city: 'São Paulo',
        state: 'SP',
        productTypes: ['Camisetas'],
      } as any;

      const user = { id: 'admin-1', role: UserRole.ADMIN };
      const result = await controller.registerCompany(dto, user);

      expect(result).toEqual(registeredCompany);
      expect(mockAdminService.registerCompany).toHaveBeenCalledWith(dto, 'admin-1');
    });

    it('deve propagar ConflictException quando e-mail já existe', async () => {
      mockAdminService.registerCompany.mockRejectedValueOnce(
        new ConflictException('Já existe um usuário com este e-mail'),
      );

      const dto = {} as any;
      const user = { id: 'admin-1', role: UserRole.ADMIN };

      await expect(
        controller.registerCompany(dto, user),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // GET /admin/companies/:id
  // =========================================================================

  describe('GET /admin/companies/:id', () => {
    it('deve retornar detalhes da empresa', async () => {
      const companyDetails = {
        id: 'company-1',
        legalName: 'Empresa LTDA',
        type: CompanyType.SUPPLIER,
        companyUsers: [],
        orderStats: [],
        avgRating: { average: 4.5, count: 10 },
      };

      mockAdminService.getCompanyDetails.mockResolvedValueOnce(companyDetails);

      const result = await controller.getCompanyDetails('company-1');

      expect(result).toEqual(companyDetails);
      expect(mockAdminService.getCompanyDetails).toHaveBeenCalledWith('company-1');
    });

    it('deve propagar NotFoundException quando empresa não existe', async () => {
      mockAdminService.getCompanyDetails.mockRejectedValueOnce(
        new NotFoundException('Empresa não encontrada'),
      );

      await expect(
        controller.getCompanyDetails('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // GET /admin/actions
  // =========================================================================

  describe('GET /admin/actions', () => {
    it('deve retornar ações administrativas com limite padrão de 50', async () => {
      const actions = [{ id: 'action-1', action: 'ACTIVATED' }];
      mockAdminService.getAdminActions.mockResolvedValueOnce(actions);

      const result = await controller.getAdminActions(undefined);

      expect(result).toEqual(actions);
      expect(mockAdminService.getAdminActions).toHaveBeenCalledWith(50);
    });

    it('deve passar limite personalizado quando fornecido', async () => {
      mockAdminService.getAdminActions.mockResolvedValueOnce([]);

      await controller.getAdminActions('25');

      expect(mockAdminService.getAdminActions).toHaveBeenCalledWith(25);
    });
  });
});
