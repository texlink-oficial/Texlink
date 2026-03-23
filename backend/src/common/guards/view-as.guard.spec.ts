import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ViewAsGuard } from './view-as.guard';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
};

function createMockContext(
  user: Record<string, unknown> | undefined,
  headers: Record<string, string> = {},
  method = 'GET',
): { context: ExecutionContext; request: Record<string, unknown> } {
  const request: Record<string, unknown> = {
    user,
    headers: { ...headers },
    method,
    url: '/api/orders',
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('ViewAsGuard', () => {
  let guard: ViewAsGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new ViewAsGuard(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // No header present
  // =========================================================================

  describe('when X-View-As-Company header is NOT present', () => {
    it('should allow request through without modification', async () => {
      const { context } = createMockContext({
        id: 'user-1',
        role: 'SUPPLIER',
        companyId: 'company-1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('should allow request when user is not present', async () => {
      const { context } = createMockContext(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // SuperAdmin ViewAs
  // =========================================================================

  describe('when SuperAdmin uses X-View-As-Company header', () => {
    const superAdminUser = {
      id: 'admin-1',
      email: 'admin@texlink.com',
      role: 'ADMIN',
      isSuperAdmin: true,
      companyId: null,
    };

    it('should override companyId with target SUPPLIER company', async () => {
      const targetCompany = {
        id: 'supplier-target',
        type: 'SUPPLIER',
        tradeName: 'Target Supplier',
      };

      mockPrisma.company.findUnique.mockResolvedValue(targetCompany);

      const { context, request } = createMockContext(
        { ...superAdminUser },
        { 'x-view-as-company': 'supplier-target' },
        'GET',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const user = request.user as Record<string, unknown>;
      expect(user.companyId).toBe('supplier-target');
      expect(user.supplierId).toBe('supplier-target');
      expect(user.brandId).toBeNull();
      expect(request.isViewAs).toBe(true);
      expect(request.viewAsCompanyId).toBe('supplier-target');
    });

    it('should override companyId with target BRAND company', async () => {
      const targetCompany = {
        id: 'brand-target',
        type: 'BRAND',
        tradeName: 'Target Brand',
      };

      mockPrisma.company.findUnique.mockResolvedValue(targetCompany);

      const { context, request } = createMockContext(
        { ...superAdminUser },
        { 'x-view-as-company': 'brand-target' },
        'GET',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const user = request.user as Record<string, unknown>;
      expect(user.companyId).toBe('brand-target');
      expect(user.brandId).toBe('brand-target');
      expect(user.supplierId).toBeNull();
    });

    it('should block mutating requests (POST, PUT, PATCH, DELETE) in ViewAs mode', async () => {
      const targetCompany = {
        id: 'supplier-target',
        type: 'SUPPLIER',
        tradeName: 'Target Supplier',
      };

      mockPrisma.company.findUnique.mockResolvedValue(targetCompany);

      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const { context } = createMockContext(
          { ...superAdminUser },
          { 'x-view-as-company': 'supplier-target' },
          method,
        );

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      }
    });

    it('should allow GET requests in ViewAs mode', async () => {
      const targetCompany = {
        id: 'supplier-target',
        type: 'SUPPLIER',
        tradeName: 'Target Supplier',
      };

      mockPrisma.company.findUnique.mockResolvedValue(targetCompany);

      const { context } = createMockContext(
        { ...superAdminUser },
        { 'x-view-as-company': 'supplier-target' },
        'GET',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow through when target company does not exist (graceful degradation)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      const { context, request } = createMockContext(
        { ...superAdminUser },
        { 'x-view-as-company': 'nonexistent-company' },
        'GET',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // companyId should NOT be overridden
      expect((request.user as Record<string, unknown>).companyId).toBeNull();
    });
  });

  // =========================================================================
  // Non-SuperAdmin attempts ViewAs
  // =========================================================================

  describe('when non-SuperAdmin tries X-View-As-Company header', () => {
    it('should silently strip header for regular SUPPLIER user', async () => {
      const regularUser = {
        id: 'user-1',
        email: 'user@supplier.com',
        role: 'SUPPLIER',
        isSuperAdmin: false,
        companyId: 'supplier-1',
      };

      const { context, request } = createMockContext(
        { ...regularUser },
        { 'x-view-as-company': 'brand-1' },
        'GET',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // companyId should NOT be overridden
      expect((request.user as Record<string, unknown>).companyId).toBe(
        'supplier-1',
      );
      // Header should be removed
      expect(
        (request.headers as Record<string, string>)['x-view-as-company'],
      ).toBeUndefined();
      // company.findUnique should NOT be called
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('should silently strip header for ADMIN user without SuperAdmin flag', async () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@texlink.com',
        role: 'ADMIN',
        isSuperAdmin: false,
        companyId: null,
      };

      const { context, request } = createMockContext(
        { ...adminUser },
        { 'x-view-as-company': 'supplier-1' },
        'GET',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        (request.headers as Record<string, string>)['x-view-as-company'],
      ).toBeUndefined();
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('should silently strip header for BRAND user attempting ViewAs', async () => {
      const brandUser = {
        id: 'user-2',
        email: 'user@brand.com',
        role: 'BRAND',
        isSuperAdmin: false,
        companyId: 'brand-1',
      };

      const { context, request } = createMockContext(
        { ...brandUser },
        { 'x-view-as-company': 'supplier-1' },
        'GET',
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((request.user as Record<string, unknown>).companyId).toBe(
        'brand-1',
      );
    });
  });
});
