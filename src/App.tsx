import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/error/ErrorBoundary';

// Error pages
const NotFoundPage = React.lazy(() => import('./pages/errors/NotFoundPage'));
const ServerErrorPage = React.lazy(() => import('./pages/errors/ServerErrorPage'));

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
const AcceptInvitePage = React.lazy(() => import('./pages/auth/AcceptInvitePage'));

// Settings pages
const TeamPage = React.lazy(() => import('./pages/settings/TeamPage'));

// Supplier pages
const SupplierKanbanDashboard = React.lazy(() => import('./pages/supplier/KanbanDashboard'));
const SupplierOrdersList = React.lazy(() => import('./pages/supplier/OrdersListPage'));
const SupplierOrderDetails = React.lazy(() => import('./pages/supplier/OrderDetailsPage'));
const SupplierOpportunities = React.lazy(() => import('./pages/supplier/OpportunitiesPage'));
const SupplierFinancial = React.lazy(() => import('./pages/supplier/FinancialDashboardPage'));
const SupplierCapacity = React.lazy(() => import('./pages/supplier/CapacityDashboardPage'));

// Brand pages
const BrandPortalLayout = React.lazy(() => import('./components/brand/BrandPortalLayout'));
const BrandDashboard = React.lazy(() => import('./pages/brand/BrandDashboard'));
const BrandKanbanDashboard = React.lazy(() => import('./pages/brand/KanbanDashboard'));
const BrandOrdersList = React.lazy(() => import('./pages/brand/OrdersListPage'));
const BrandCreateOrder = React.lazy(() => import('./pages/brand/CreateOrderPage'));
const BrandOrderDetails = React.lazy(() => import('./pages/brand/OrderDetailsPage'));
const BrandSuppliers = React.lazy(() => import('./pages/brand/SuppliersPage'));
const BrandSuppliersPage = React.lazy(() => import('./pages/brand/BrandSuppliersPage'));
const BrandSupplierProfile = React.lazy(() => import('./pages/brand/SupplierProfilePage'));
const BrandPartners = React.lazy(() => import('./pages/brand/PartnersPage'));
const BrandMessages = React.lazy(() => import('./pages/brand/MessagesPage'));
const BrandPayments = React.lazy(() => import('./pages/brand/PaymentsPage'));
const BrandPaymentHistory = React.lazy(() => import('./pages/brand/PaymentHistoryPage'));
const BrandReports = React.lazy(() => import('./pages/brand/ReportsPage'));
const BrandFavorites = React.lazy(() => import('./pages/brand/FavoritesPage'));
const CredentialsListPage = React.lazy(() => import('./pages/brand/credentials/CredentialsListPage'));
const NewCredentialPage = React.lazy(() => import('./pages/brand/credentials/NewCredentialPage'));
const CredentialDetailsPage = React.lazy(() => import('./pages/brand/credentials/CredentialDetailsPage'));
const AddSupplierPage = React.lazy(() => import('./pages/brand/suppliers/AddSupplierPage'));
const RelationshipDetailsPage = React.lazy(() => import('./pages/brand/suppliers/RelationshipDetailsPage'));

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminApprovals = React.lazy(() => import('./pages/admin/ApprovalsPage'));
const AdminSuppliers = React.lazy(() => import('./pages/admin/SuppliersPage'));
const AdminSuppliersPool = React.lazy(() => import('./pages/admin/SuppliersPoolPage'));

// Portal do Parceiro pages
const PortalLayout = React.lazy(() => import('./components/portal/PortalLayout'));
const PortalDashboard = React.lazy(() => import('./pages/portal/PortalDashboard'));
const PerformancePage = React.lazy(() => import('./pages/portal/PerformancePage'));
const ReportsPage = React.lazy(() => import('./pages/portal/ReportsPage'));
const DepositsPage = React.lazy(() => import('./pages/portal/financial/DepositsPage'));
const DepositDetailPage = React.lazy(() => import('./pages/portal/financial/DepositDetailPage'));
const BankDetailsPage = React.lazy(() => import('./pages/portal/financial/BankDetailsPage'));
const PayoutFrequencyPage = React.lazy(() => import('./pages/portal/financial/PayoutFrequencyPage'));
const AdvancePage = React.lazy(() => import('./pages/portal/financial/AdvancePage'));
const SupplierBrandsPage = React.lazy(() => import('./pages/portal/BrandsPage'));

// Onboarding pages
const OnboardingLayout = React.lazy(() => import('./components/onboarding/OnboardingLayout'));
const Phase2Page = React.lazy(() => import('./pages/onboarding/Phase2Page'));
const Phase3Page = React.lazy(() => import('./pages/onboarding/Phase3Page'));


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
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <PermissionProvider>
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
                            <Route path="/convite/:token" element={<AcceptInvitePage />} />

                            {/* Onboarding routes (protected, supplier only) */}
                            <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><OnboardingLayout /></ProtectedRoute>}>
                                <Route path="phase2" element={<Phase2Page />} />
                                <Route path="phase3" element={<Phase3Page />} />
                            </Route>

                            {/* Dashboard redirect */}
                            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

                            {/* Portal do Parceiro routes - includes all supplier pages with sidebar */}
                            <Route path="/portal" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><PortalLayout /></ProtectedRoute>}>
                                <Route index element={<Navigate to="/portal/inicio" replace />} />
                                <Route path="inicio" element={<PortalDashboard />} />
                                <Route path="desempenho" element={<PerformancePage />} />
                                <Route path="relatorios" element={<ReportsPage />} />
                                {/* Pedidos - integrated supplier pages */}
                                <Route path="pedidos" element={<SupplierKanbanDashboard />} />
                                <Route path="pedidos/lista" element={<SupplierOrdersList />} />
                                <Route path="pedidos/:id" element={<SupplierOrderDetails />} />
                                <Route path="oportunidades" element={<SupplierOpportunities />} />
                                <Route path="capacidade" element={<SupplierCapacity />} />
                                {/* Marcas (V3 N:M Relationships) */}
                                <Route path="marcas" element={<SupplierBrandsPage />} />
                                {/* Financeiro */}
                                <Route path="financeiro/depositos" element={<DepositsPage />} />
                                <Route path="financeiro/depositos/:id" element={<DepositDetailPage />} />
                                <Route path="financeiro/dados-bancarios" element={<BankDetailsPage />} />
                                <Route path="financeiro/frequencia" element={<PayoutFrequencyPage />} />
                                <Route path="financeiro/antecipacao" element={<AdvancePage />} />
                                {/* Configurações */}
                                <Route path="equipe" element={<TeamPage />} />
                            </Route>

                            {/* Legacy supplier routes - redirect to portal */}
                            <Route path="/supplier" element={<Navigate to="/portal/pedidos" replace />} />
                            <Route path="/supplier/orders" element={<Navigate to="/portal/pedidos/lista" replace />} />
                            <Route path="/supplier/orders/:id" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierOrderDetails /></ProtectedRoute>} />
                            <Route path="/supplier/opportunities" element={<Navigate to="/portal/oportunidades" replace />} />
                            <Route path="/supplier/financial" element={<Navigate to="/portal/financeiro/depositos" replace />} />
                            <Route path="/supplier/capacity" element={<Navigate to="/portal/capacidade" replace />} />

                            {/* Brand Portal routes - includes all brand pages with sidebar */}
                            <Route path="/brand" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandPortalLayout /></ProtectedRoute>}>
                                <Route index element={<Navigate to="/brand/inicio" replace />} />
                                <Route path="inicio" element={<BrandDashboard />} />
                                {/* Pedidos */}
                                <Route path="pedidos" element={<BrandKanbanDashboard />} />
                                <Route path="pedidos/lista" element={<BrandOrdersList />} />
                                <Route path="pedidos/novo" element={<BrandCreateOrder />} />
                                <Route path="pedidos/:id" element={<BrandOrderDetails />} />
                                {/* Facções */}
                                <Route path="faccoes" element={<BrandSuppliers />} />
                                <Route path="faccoes/parceiros" element={<BrandPartners />} />
                                <Route path="faccoes/:id" element={<BrandSupplierProfile />} />
                                {/* Fornecedores (V3 N:M Relationships) */}
                                <Route path="fornecedores" element={<BrandSuppliersPage />} />
                                <Route path="fornecedores/adicionar" element={<AddSupplierPage />} />
                                <Route path="fornecedores/:id" element={<RelationshipDetailsPage />} />
                                {/* Mensagens */}
                                <Route path="mensagens" element={<BrandMessages />} />
                                {/* Financeiro */}
                                <Route path="financeiro/pagamentos" element={<BrandPayments />} />
                                <Route path="financeiro/historico" element={<BrandPaymentHistory />} />
                                {/* Relatórios */}
                                <Route path="relatorios" element={<BrandReports />} />
                                {/* Favoritos */}
                                <Route path="favoritos" element={<BrandFavorites />} />
                                {/* Credenciamento */}
                                <Route path="credenciamento" element={<CredentialsListPage />} />
                                <Route path="credenciamento/novo" element={<NewCredentialPage />} />
                                <Route path="credenciamento/:id" element={<CredentialDetailsPage />} />
                                {/* Configurações */}
                                <Route path="equipe" element={<TeamPage />} />
                            </Route>

                            {/* Legacy brand routes - redirect to new portal */}
                            <Route path="/brand/orders" element={<Navigate to="/brand/pedidos/lista" replace />} />
                            <Route path="/brand/orders/new" element={<Navigate to="/brand/pedidos/novo" replace />} />
                            <Route path="/brand/suppliers" element={<Navigate to="/brand/faccoes" replace />} />

                            {/* Admin routes */}
                            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                            <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminApprovals /></ProtectedRoute>} />
                            <Route path="/admin/suppliers" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSuppliers /></ProtectedRoute>} />
                            <Route path="/admin/suppliers-pool" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSuppliersPool /></ProtectedRoute>} />

                            {/* Error pages */}
                            <Route path="/500" element={<ServerErrorPage />} />

                            {/* Default redirect */}
                            <Route path="/" element={<Navigate to="/login" replace />} />

                            {/* 404 - must be last */}
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                            </React.Suspense>
                        </BrowserRouter>
                    </PermissionProvider>
                </AuthProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
};

const DashboardRouter: React.FC = () => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    switch (user.role) {
        case 'SUPPLIER':
            return <Navigate to="/portal/inicio" replace />;
        case 'BRAND':
            return <Navigate to="/brand" replace />;
        case 'ADMIN':
            return <Navigate to="/admin" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default App;

