import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from './components/ui/ToastContainer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/error/ErrorBoundary';

// Error pages
const NotFoundPage = React.lazy(() => import('./pages/errors/NotFoundPage'));
const ServerErrorPage = React.lazy(() => import('./pages/errors/ServerErrorPage'));

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
const AcceptInvitePage = React.lazy(() => import('./pages/auth/AcceptInvitePage'));
const AcceptInvitationPage = React.lazy(() => import('./pages/public/AcceptInvitationPage'));

// Settings pages
const TeamPage = React.lazy(() => import('./pages/settings/TeamPage'));

// Supplier pages
const SupplierKanbanDashboard = React.lazy(() => import('./pages/supplier/KanbanDashboard'));
const SupplierOrdersList = React.lazy(() => import('./pages/supplier/OrdersListPage'));
const SupplierOrderDetails = React.lazy(() => import('./pages/supplier/OrderDetailsPage'));
const SupplierOpportunities = React.lazy(() => import('./pages/supplier/OpportunitiesPage'));
const SupplierFinancial = React.lazy(() => import('./pages/supplier/FinancialDashboardPage'));
const SupplierCapacity = React.lazy(() => import('./pages/supplier/CapacityDashboardPage'));
const SupplierDocuments = React.lazy(() => import('./pages/supplier/DocumentsPage'));
const SupplierPartners = React.lazy(() => import('./pages/supplier/PartnersPage'));
const SupplierEduca = React.lazy(() => import('./pages/supplier/EducaPage'));
const SupplierHelpCenter = React.lazy(() => import('./pages/supplier/HelpCenterPage'));
const SupplierTicketDetail = React.lazy(() => import('./pages/supplier/TicketDetailPage'));
const SupplierSettings = React.lazy(() => import('./pages/supplier/SettingsPage'));

// Brand pages
const BrandPortalLayout = React.lazy(() => import('./components/brand/BrandPortalLayout'));
const BrandDashboard = React.lazy(() => import('./pages/brand/BrandDashboard'));
const BrandKanbanDashboard = React.lazy(() => import('./pages/brand/KanbanDashboard'));
const BrandOrdersList = React.lazy(() => import('./pages/brand/OrdersListPage'));
const BrandCreateOrder = React.lazy(() => import('./pages/brand/CreateOrderPage'));
const BrandOrderDetails = React.lazy(() => import('./pages/brand/OrderDetailsPage'));
const BrandSuppliersPage = React.lazy(() => import('./pages/brand/BrandSuppliersPage'));
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
const BrandPartnershipRequestsPage = React.lazy(() => import('./pages/brand/suppliers/PartnershipRequestsPage'));
const BrandHelpCenter = React.lazy(() => import('./pages/brand/HelpCenterPage'));
const BrandTicketDetail = React.lazy(() => import('./pages/brand/TicketDetailPage'));
const BrandAnalyticsDashboard = React.lazy(() => import('./pages/brand/AnalyticsDashboardPage'));
const RejectionAnalyticsPage = React.lazy(() => import('./pages/brand/reports/RejectionAnalyticsPage'));
const CapacityUtilizationPage = React.lazy(() => import('./pages/brand/reports/CapacityUtilizationPage'));
const BrandCodeOfConductPage = React.lazy(() => import('./pages/brand/documents/CodeOfConductPage'));
const BrandCodeOfConductReportPage = React.lazy(() => import('./pages/brand/documents/CodeOfConductReportPage'));
const BrandContractsListPage = React.lazy(() => import('./pages/brand/contracts/ContractsListPage'));
const BrandContractDetailsPage = React.lazy(() => import('./pages/brand/contracts/ContractDetailsPage'));
const BrandCreateContractPage = React.lazy(() => import('./pages/brand/contracts/CreateContractPage'));
const SupplierContractsListPage = React.lazy(() => import('./pages/supplier/contracts/ContractsListPage'));
const SupplierContractDetailsPage = React.lazy(() => import('./pages/supplier/contracts/ContractDetailsPage'));
const BrandSettings = React.lazy(() => import('./pages/brand/BrandSettingsPage'));

// Profile pages - eagerly imported to avoid lazy-loading issues with React Router v7
import SupplierProfilePage from './pages/supplier/ProfilePage';
import BrandProfilePage from './pages/brand/ProfilePage';

const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminApprovals = React.lazy(() => import('./pages/admin/ApprovalsPage'));
const AdminSuppliers = React.lazy(() => import('./pages/admin/SuppliersPage'));
const AdminSuppliersPool = React.lazy(() => import('./pages/admin/SuppliersPoolPage'));
const AdminPartners = React.lazy(() => import('./pages/admin/PartnersPage'));
const AdminEducationalContent = React.lazy(() => import('./pages/admin/EducationalContentPage'));
const AdminSupportTickets = React.lazy(() => import('./pages/admin/SupportTicketsPage'));
const AdminBrands = React.lazy(() => import('./pages/admin/BrandsPage'));
const AdminOrders = React.lazy(() => import('./pages/admin/OrdersPage'));
const AdminDocuments = React.lazy(() => import('./pages/admin/DocumentsPage'));
const AdminUsers = React.lazy(() => import('./pages/admin/UsersPage'));

// Shared pages
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));

// Portal do Parceiro pages
const PortalLayout = React.lazy(() => import('./components/portal/PortalLayout'));
const PortalDashboard = React.lazy(() => import('./pages/portal/PortalDashboard'));
const PerformancePage = React.lazy(() => import('./pages/portal/PerformancePage'));
const ReportsPage = React.lazy(() => import('./pages/portal/ReportsPage'));
const PortalMessages = React.lazy(() => import('./pages/portal/MessagesPage'));
const DepositsPage = React.lazy(() => import('./pages/portal/financial/DepositsPage'));
const DepositDetailPage = React.lazy(() => import('./pages/portal/financial/DepositDetailPage'));

const PayoutFrequencyPage = React.lazy(() => import('./pages/portal/financial/PayoutFrequencyPage'));
const AdvancePage = React.lazy(() => import('./pages/portal/financial/AdvancePage'));
const SupplierBrandsPage = React.lazy(() => import('./pages/portal/BrandsPage'));
const SupplierPartnershipRequestsPage = React.lazy(() => import('./pages/supplier/PartnershipRequestsPage'));

// Onboarding pages
const OnboardingLayout = React.lazy(() => import('./components/onboarding/OnboardingLayout'));
const OnboardingIndexPage = React.lazy(() => import('./pages/onboarding/OnboardingIndexPage'));
const OnboardingBusinessPage = React.lazy(() => import('./pages/onboarding/OnboardingBusinessPage'));
const BrandOnboardingLayout = React.lazy(() => import('./components/onboarding/BrandOnboardingLayout'));
const BrandOnboardingIndexPage = React.lazy(() => import('./pages/onboarding/BrandOnboardingIndexPage'));
const BrandOnboardingBusinessPage = React.lazy(() => import('./pages/onboarding/BrandOnboardingBusinessPage'));


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
            <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <ToastProvider>
                        <NotificationProvider>
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
                                            <Route path="/aceitar-convite/:token" element={<AcceptInvitationPage />} />

                                            {/* Onboarding routes (protected, supplier only) */}
                                            <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><OnboardingLayout /></ProtectedRoute>}>
                                                <Route index element={<OnboardingIndexPage />} />
                                                <Route path="qualificacao" element={<OnboardingBusinessPage />} />
                                            </Route>

                                            {/* Brand onboarding routes (protected, brand only) */}
                                            <Route path="/brand-onboarding" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandOnboardingLayout /></ProtectedRoute>}>
                                                <Route index element={<BrandOnboardingIndexPage />} />
                                                <Route path="qualificacao" element={<BrandOnboardingBusinessPage />} />
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
                                                {/* Mensagens */}
                                                <Route path="mensagens" element={<PortalMessages />} />
                                                <Route path="capacidade" element={<SupplierCapacity />} />
                                                {/* Marcas (V3 N:M Relationships) */}
                                                <Route path="marcas" element={<SupplierBrandsPage />} />
                                                {/* Solicitações de Parceria */}
                                                <Route path="solicitacoes" element={<SupplierPartnershipRequestsPage />} />
                                                {/* Documentos */}
                                                <Route path="documentos" element={<SupplierDocuments />} />
                                                {/* Contratos */}
                                                <Route path="contratos" element={<SupplierContractsListPage />} />
                                                <Route path="contratos/:id" element={<SupplierContractDetailsPage />} />
                                                {/* Parceiros */}
                                                <Route path="parceiros" element={<SupplierPartners />} />
                                                {/* Texlink Educa */}
                                                <Route path="educa" element={<SupplierEduca />} />
                                                {/* Central de Ajuda */}
                                                <Route path="suporte" element={<SupplierHelpCenter />} />
                                                <Route path="suporte/:id" element={<SupplierTicketDetail />} />
                                                {/* Financeiro */}
                                                <Route path="financeiro/depositos" element={<DepositsPage />} />
                                                <Route path="financeiro/depositos/:id" element={<DepositDetailPage />} />

                                                <Route path="financeiro/frequencia" element={<PayoutFrequencyPage />} />
                                                <Route path="financeiro/antecipacao" element={<AdvancePage />} />
                                                {/* Configurações */}
                                                <Route path="equipe" element={<TeamPage />} />
                                                <Route path="configuracoes" element={<SupplierSettings />} />
                                                <Route path="perfil" element={<SupplierProfilePage />} />
                                                <Route path="notificacoes" element={<NotificationsPage />} />
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
                                                {/* Facções → redirect to Fornecedores (V3) */}
                                                <Route path="faccoes" element={<Navigate to="/brand/fornecedores" replace />} />
                                                <Route path="faccoes/parceiros" element={<Navigate to="/brand/fornecedores" replace />} />
                                                <Route path="faccoes/:id" element={<Navigate to="/brand/fornecedores" replace />} />
                                                {/* Fornecedores (V3 N:M Relationships) */}
                                                <Route path="fornecedores" element={<BrandSuppliersPage />} />
                                                <Route path="fornecedores/solicitacoes" element={<BrandPartnershipRequestsPage />} />
                                                <Route path="fornecedores/adicionar" element={<AddSupplierPage />} />
                                                <Route path="fornecedores/:id" element={<RelationshipDetailsPage />} />
                                                {/* Mensagens */}
                                                <Route path="mensagens" element={<BrandMessages />} />
                                                {/* Financeiro */}
                                                <Route path="financeiro/pagamentos" element={<BrandPayments />} />
                                                <Route path="financeiro/historico" element={<BrandPaymentHistory />} />
                                                {/* Relatórios e Analytics */}
                                                <Route path="relatorios" element={<BrandReports />} />
                                                <Route path="relatorios/rejeicoes" element={<RejectionAnalyticsPage />} />
                                                <Route path="relatorios/capacidade" element={<CapacityUtilizationPage />} />
                                                <Route path="analytics" element={<BrandAnalyticsDashboard />} />
                                                {/* Favoritos */}
                                                <Route path="favoritos" element={<BrandFavorites />} />
                                                {/* Credenciamento */}
                                                <Route path="credenciamento" element={<CredentialsListPage />} />
                                                <Route path="credenciamento/novo" element={<NewCredentialPage />} />
                                                <Route path="credenciamento/:id" element={<CredentialDetailsPage />} />
                                                {/* Central de Ajuda */}
                                                <Route path="suporte" element={<BrandHelpCenter />} />
                                                <Route path="suporte/:id" element={<BrandTicketDetail />} />
                                                {/* Documentos */}
                                                <Route path="documentos/codigo-conduta" element={<BrandCodeOfConductPage />} />
                                                <Route path="documentos/codigo-conduta/relatorio" element={<BrandCodeOfConductReportPage />} />
                                                {/* Contratos */}
                                                <Route path="contratos" element={<BrandContractsListPage />} />
                                                <Route path="contratos/novo" element={<BrandCreateContractPage />} />
                                                <Route path="contratos/:id" element={<BrandContractDetailsPage />} />
                                                {/* Configurações */}
                                                <Route path="equipe" element={<TeamPage />} />
                                                <Route path="configuracoes" element={<BrandSettings />} />
                                                <Route path="perfil" element={<BrandProfilePage />} />
                                                <Route path="notificacoes" element={<NotificationsPage />} />
                                            </Route>

                                            {/* Legacy brand routes - redirect to new portal */}
                                            <Route path="/brand/orders" element={<Navigate to="/brand/pedidos/lista" replace />} />
                                            <Route path="/brand/orders/new" element={<Navigate to="/brand/pedidos/novo" replace />} />
                                            <Route path="/brand/suppliers" element={<Navigate to="/brand/fornecedores" replace />} />

                                            {/* Admin routes */}
                                            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
                                                <Route index element={<AdminDashboard />} />
                                                <Route path="approvals" element={<AdminApprovals />} />
                                                <Route path="suppliers" element={<AdminSuppliers />} />
                                                <Route path="suppliers-pool" element={<AdminSuppliersPool />} />
                                                <Route path="brands" element={<AdminBrands />} />
                                                <Route path="orders" element={<AdminOrders />} />
                                                <Route path="partners" element={<AdminPartners />} />
                                                <Route path="educational-content" element={<AdminEducationalContent />} />
                                                <Route path="support" element={<AdminSupportTickets />} />
                                                <Route path="documents" element={<AdminDocuments />} />
                                                <Route path="users" element={<AdminUsers />} />
                                                <Route path="notificacoes" element={<NotificationsPage />} />
                                            </Route>

                                            {/* Error pages */}
                                            <Route path="/500" element={<ServerErrorPage />} />

                                            {/* Default redirect */}
                                            <Route path="/" element={<Navigate to="/login" replace />} />

                                            {/* 404 - must be last */}
                                            <Route path="*" element={<NotFoundPage />} />
                                        </Routes>
                                    </React.Suspense>
                                    <ToastContainer />
                                </BrowserRouter>
                            </PermissionProvider>
                        </NotificationProvider>
                    </ToastProvider>
                </AuthProvider>
            </QueryClientProvider>
            </ThemeProvider>
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

