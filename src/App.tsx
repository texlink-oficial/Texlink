import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Supplier pages
const SupplierKanbanDashboard = React.lazy(() => import('./pages/supplier/KanbanDashboard'));
const SupplierOrdersList = React.lazy(() => import('./pages/supplier/OrdersListPage'));
const SupplierOrderDetails = React.lazy(() => import('./pages/supplier/OrderDetailsPage'));
const SupplierOpportunities = React.lazy(() => import('./pages/supplier/OpportunitiesPage'));
const SupplierFinancial = React.lazy(() => import('./pages/supplier/FinancialDashboardPage'));
const SupplierCapacity = React.lazy(() => import('./pages/supplier/CapacityDashboardPage'));

// Brand pages
const BrandKanbanDashboard = React.lazy(() => import('./pages/brand/KanbanDashboard'));
const BrandOrdersList = React.lazy(() => import('./pages/brand/OrdersListPage'));
const BrandCreateOrder = React.lazy(() => import('./pages/brand/CreateOrderPage'));
const BrandSuppliers = React.lazy(() => import('./pages/brand/SuppliersPage'));

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminApprovals = React.lazy(() => import('./pages/admin/ApprovalsPage'));
const AdminSuppliers = React.lazy(() => import('./pages/admin/SuppliersPage'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <React.Suspense
                        fallback={
                            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        }
                    >
                        <Routes>
                            {/* Public routes */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />

                            {/* Dashboard redirect */}
                            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

                            {/* Supplier routes */}
                            <Route path="/supplier" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierKanbanDashboard /></ProtectedRoute>} />
                            <Route path="/supplier/orders" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierOrdersList /></ProtectedRoute>} />
                            <Route path="/supplier/orders/:id" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierOrderDetails /></ProtectedRoute>} />
                            <Route path="/supplier/opportunities" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierOpportunities /></ProtectedRoute>} />
                            <Route path="/supplier/financial" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierFinancial /></ProtectedRoute>} />
                            <Route path="/supplier/capacity" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierCapacity /></ProtectedRoute>} />

                            {/* Brand routes */}
                            <Route path="/brand" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandKanbanDashboard /></ProtectedRoute>} />
                            <Route path="/brand/orders" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandOrdersList /></ProtectedRoute>} />
                            <Route path="/brand/orders/new" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandCreateOrder /></ProtectedRoute>} />
                            <Route path="/brand/suppliers" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandSuppliers /></ProtectedRoute>} />

                            {/* Admin routes */}
                            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                            <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminApprovals /></ProtectedRoute>} />
                            <Route path="/admin/suppliers" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSuppliers /></ProtectedRoute>} />

                            {/* Default redirect */}
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </React.Suspense>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
};

const DashboardRouter: React.FC = () => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    switch (user.role) {
        case 'SUPPLIER':
            return <Navigate to="/supplier" replace />;
        case 'BRAND':
            return <Navigate to="/brand" replace />;
        case 'ADMIN':
            return <Navigate to="/admin" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default App;
