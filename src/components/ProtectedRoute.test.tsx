import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Use vi.hoisted so the mock reference is available in the factory
const mockUseAuth = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    viewAs: null,
  }),
);

vi.mock('../contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

import ProtectedRoute from './ProtectedRoute';

// Helper to render within a router context and capture navigation
function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      viewAs: null,
    });
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', name: 'User', role: 'BRAND', isActive: true },
      isLoading: false,
      isAuthenticated: true,
      viewAs: null,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Page</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Protected Page')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      viewAs: null,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Should Not Render</div>
      </ProtectedRoute>,
    );

    // Navigate component should render, so protected content should NOT be in the DOM
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows loading spinner while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      viewAs: null,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Should Not Render</div>
      </ProtectedRoute>,
    );

    // Protected content should not be visible while loading
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  describe('role-based access', () => {
    it('renders children when user role matches allowedRoles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u1', name: 'Brand User', role: 'BRAND', isActive: true },
        isLoading: false,
        isAuthenticated: true,
        viewAs: null,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['BRAND', 'ADMIN']}>
          <div data-testid="brand-content">Brand Page</div>
        </ProtectedRoute>,
      );

      expect(screen.getByTestId('brand-content')).toBeInTheDocument();
    });

    it('redirects to /dashboard when role does not match allowedRoles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u1', name: 'Supplier', role: 'SUPPLIER', isActive: true },
        isLoading: false,
        isAuthenticated: true,
        viewAs: null,
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['BRAND', 'ADMIN']}>
          <div data-testid="brand-only">Brand Only Content</div>
        </ProtectedRoute>,
      );

      expect(screen.queryByTestId('brand-only')).not.toBeInTheDocument();
    });

    it('allows access when no allowedRoles specified (any authenticated user)', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u1', name: 'Any User', role: 'SUPPLIER', isActive: true },
        isLoading: false,
        isAuthenticated: true,
        viewAs: null,
      });

      renderWithRouter(
        <ProtectedRoute>
          <div data-testid="any-role-content">Any Role Content</div>
        </ProtectedRoute>,
      );

      expect(screen.getByTestId('any-role-content')).toBeInTheDocument();
    });

    it('allows ADMIN access even when viewing as different role', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u1', name: 'Admin', role: 'ADMIN', isActive: true, isSuperAdmin: true },
        isLoading: false,
        isAuthenticated: true,
        viewAs: { role: 'BRAND', companyId: 'c1', companyName: 'Test Brand' },
      });

      renderWithRouter(
        <ProtectedRoute allowedRoles={['ADMIN', 'BRAND']}>
          <div data-testid="admin-view-as">Admin Viewing as Brand</div>
        </ProtectedRoute>,
      );

      expect(screen.getByTestId('admin-view-as')).toBeInTheDocument();
    });

    it('uses effective role (viewAs) for access check', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'u1', name: 'Admin', role: 'ADMIN', isActive: true, isSuperAdmin: true },
        isLoading: false,
        isAuthenticated: true,
        viewAs: { role: 'SUPPLIER', companyId: 'c2', companyName: 'Test Supplier' },
      });

      // allowedRoles includes SUPPLIER (the viewAs role) but also includes ADMIN
      renderWithRouter(
        <ProtectedRoute allowedRoles={['SUPPLIER']}>
          <div data-testid="supplier-content">Supplier Content</div>
        </ProtectedRoute>,
      );

      // ADMIN user viewing as SUPPLIER should have access because effectiveRole is SUPPLIER
      expect(screen.getByTestId('supplier-content')).toBeInTheDocument();
    });
  });
});
