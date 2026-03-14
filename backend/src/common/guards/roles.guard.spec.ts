import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockExecutionContext(user?: {
  id: string;
  email: string;
  role: UserRole;
}): ExecutionContext {
  const mockRequest = { user };

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // No roles defined on route (public route)
  // =========================================================================

  describe('when no roles are required', () => {
    it('should allow access when no @Roles decorator is present', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.SUPPLIER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  // =========================================================================
  // Role-based checks
  // =========================================================================

  describe('when roles are required', () => {
    it('should allow SUPPLIER user when SUPPLIER role is required', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPPLIER]);

      const context = createMockExecutionContext({
        id: 'user-1',
        email: 'supplier@example.com',
        role: UserRole.SUPPLIER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow BRAND user when BRAND role is required', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.BRAND]);

      const context = createMockExecutionContext({
        id: 'user-1',
        email: 'brand@example.com',
        role: UserRole.BRAND,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny SUPPLIER user when only BRAND role is required', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.BRAND]);

      const context = createMockExecutionContext({
        id: 'user-1',
        email: 'supplier@example.com',
        role: UserRole.SUPPLIER,
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny BRAND user when only SUPPLIER role is required', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPPLIER]);

      const context = createMockExecutionContext({
        id: 'user-1',
        email: 'brand@example.com',
        role: UserRole.BRAND,
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow user when multiple roles are required and user has one of them', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.BRAND, UserRole.SUPPLIER]);

      const context = createMockExecutionContext({
        id: 'user-1',
        email: 'supplier@example.com',
        role: UserRole.SUPPLIER,
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  // =========================================================================
  // ADMIN bypass
  // =========================================================================

  describe('ADMIN role bypass', () => {
    it('should allow ADMIN user through any role-gated route', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPPLIER]);

      const context = createMockExecutionContext({
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow ADMIN even when only BRAND is required', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.BRAND]);

      const context = createMockExecutionContext({
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow ADMIN when multiple roles are listed', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.BRAND, UserRole.SUPPLIER]);

      const context = createMockExecutionContext({
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  // =========================================================================
  // No user (unauthenticated)
  // =========================================================================

  describe('when user is not present (unauthenticated)', () => {
    it('should deny access when roles are required but no user on request', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.SUPPLIER]);

      const context = createMockExecutionContext(undefined);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow access when no roles are required and no user on request', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  // =========================================================================
  // Reflector metadata extraction
  // =========================================================================

  describe('metadata extraction', () => {
    it('should use ROLES_KEY to extract required roles', () => {
      const spy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(undefined);

      const context = createMockExecutionContext({
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.SUPPLIER,
      });

      guard.canActivate(context);

      // Verify it was called with the ROLES_KEY and an array of two elements
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toBe(ROLES_KEY);
      expect(spy.mock.calls[0][1]).toHaveLength(2);
    });
  });
});
