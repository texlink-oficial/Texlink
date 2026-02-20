import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { NotificationBell } from '../notifications';
import { Tooltip } from '../ui/Tooltip';
import { UserMenuDropdown } from './UserMenuDropdown';
import {
  Home,
  BarChart3,
  FileText,
  Package,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Gauge,
  PanelLeftClose,
  PanelLeft,
  Moon,
  Sun,
  Building2,
  FolderOpen,
  Gift,
  GraduationCap,
  HelpCircle,
  Star,
  Activity,
  FileSignature,
  MessageSquare,
} from 'lucide-react';
import { suppliersService, SupplierDashboard } from '../../services';
import { brandDocumentsService } from '../../services/brandDocuments.service';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'operacional',
    label: 'Operacional',
    items: [
      {
        id: 'inicio',
        label: 'Início',
        icon: <Home className="h-5 w-5" />,
        path: '/portal/inicio',
      },
      {
        id: 'pedidos',
        label: 'Pedidos',
        icon: <Package className="h-5 w-5" />,
        children: [
          { label: 'Gerenciamento', path: '/portal/pedidos' },
          { label: 'Oportunidades', path: '/portal/oportunidades' },
        ],
      },
      {
        id: 'mensagens',
        label: 'Mensagens',
        icon: <MessageSquare className="h-5 w-5" />,
        path: '/portal/mensagens',
      },
      {
        id: 'capacidade',
        label: 'Ocupação',
        icon: <Gauge className="h-5 w-5" />,
        path: '/portal/capacidade',
      },
      {
        id: 'desempenho',
        label: 'Desempenho',
        icon: <BarChart3 className="h-5 w-5" />,
        path: '/portal/desempenho',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    items: [
      {
        id: 'financeiro',
        label: 'Financeiro',
        icon: <DollarSign className="h-5 w-5" />,
        path: '/portal/financeiro/depositos',
      },
    ],
  },
  {
    id: 'recursos',
    label: 'Recursos',
    items: [
      {
        id: 'marcas',
        label: 'Minhas Marcas',
        icon: <Building2 className="h-5 w-5" />,
        path: '/portal/marcas',
      },
      {
        id: 'solicitacoes',
        label: 'Solicitações de Vínculo',
        icon: <Star className="h-5 w-5" />,
        path: '/portal/solicitacoes',
      },
      {
        id: 'documentos',
        label: 'Documentos',
        icon: <FolderOpen className="h-5 w-5" />,
        path: '/portal/documentos',
      },
      {
        id: 'contratos',
        label: 'Contratos',
        icon: <FileSignature className="h-5 w-5" />,
        path: '/portal/contratos',
      },
      {
        id: 'relatorios',
        label: 'Relatórios',
        icon: <FileText className="h-5 w-5" />,
        path: '/portal/relatorios',
      },
    ],
  },
  {
    id: 'suporte',
    label: 'Suporte',
    items: [
      {
        id: 'parceiros',
        label: 'Parceiros',
        icon: <Gift className="h-5 w-5" />,
        path: '/portal/parceiros',
      },
      {
        id: 'educa',
        label: 'Texlink Educa',
        icon: <GraduationCap className="h-5 w-5" />,
        path: '/portal/educa',
      },
      {
        id: 'suporte',
        label: 'Central de Ajuda',
        icon: <HelpCircle className="h-5 w-5" />,
        path: '/portal/suporte',
      },
    ],
  },
];

export const PortalSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['pedidos']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [supplierProfile, setSupplierProfile] = useState<SupplierDashboard | null>(null);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const { darkMode, toggleDarkMode } = useTheme();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Load supplier dashboard data (reload on navigation to pick up capacity changes)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await suppliersService.getDashboard();
        setSupplierProfile(data);
      } catch (error) {
        console.error('Error loading supplier profile:', error);
      }
    };
    loadProfile();
  }, [location.pathname]);

  // Load pending documents count
  useEffect(() => {
    const loadPendingDocs = async () => {
      try {
        const count = await brandDocumentsService.getPendingCount();
        setPendingDocsCount(count);
      } catch (error) {
        console.error('Error loading pending docs count:', error);
      }
    };
    loadPendingDocs();
  }, []);

  const toggleExpand = (id: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Wrap collapsed items with tooltip
  const CollapsedTooltip = ({
    children,
    label,
    collapsed,
  }: {
    children: React.ReactElement;
    label: string;
    collapsed: boolean;
  }) => {
    if (!collapsed) return children;
    return (
      <Tooltip content={label} placement="right">
        {children}
      </Tooltip>
    );
  };

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {/* Header Compacto */}
      <div className="px-3 py-2 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center ${collapsed ? '' : 'gap-2'}`}>
            {/* Texlink Logo Icon with Premium Glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500/30 blur-lg rounded-xl animate-pulse-glow" />
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
                <svg
                  className="h-5 w-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  Texlink
                </h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Portal do Parceiro</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <button
                onClick={toggleDarkMode}
                aria-label={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {darkMode ? (
                  <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                )}
              </button>
              <button
                onClick={toggleCollapse}
                aria-label="Recolher menu lateral"
                className="hidden lg:flex p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <PanelLeftClose className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={toggleCollapse}
              aria-label="Expandir menu lateral"
              className="hidden lg:flex p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mt-1"
            >
              <PanelLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* User Avatar Dropdown */}
      <div className="px-2 py-2 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
        <UserMenuDropdown
          user={user}
          collapsed={collapsed}
          onNavigate={() => setIsMobileMenuOpen(false)}
          onLogout={handleLogout}
        />
      </div>

      {/* Supplier Status Card */}
      {supplierProfile && (
        <div className={`px-3 py-2 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <CollapsedTooltip
              label={`${supplierProfile.company?.status === 'ACTIVE' ? 'Ativa' : supplierProfile.company?.status === 'SUSPENDED' ? 'Suspensa' : 'Pendente'} • ⭐ ${Number(supplierProfile.company?.avgRating || 0).toFixed(1)} • ${supplierProfile.stats?.capacityUsage || 0}% ocupação`}
              collapsed={collapsed}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${supplierProfile.company?.status === 'ACTIVE'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : supplierProfile.company?.status === 'SUSPENDED'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-yellow-100 dark:bg-yellow-900/30'
                }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${supplierProfile.company?.status === 'ACTIVE'
                    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                    : supplierProfile.company?.status === 'SUSPENDED'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`} />
              </div>
            </CollapsedTooltip>
          ) : (
            <div className="flex items-center justify-between gap-2 px-1">
              {/* Rating */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {Number(supplierProfile.company?.avgRating || 0).toFixed(1)}
                </span>
              </div>

              {/* Capacity with Gradient */}
              <div className="flex items-center gap-1.5 flex-1">
                <Activity className="h-3 w-3 text-gray-400" />
                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${(supplierProfile.stats?.capacityUsage || 0) >= 90
                        ? 'bg-gradient-to-r from-red-500 to-red-400'
                        : (supplierProfile.stats?.capacityUsage || 0) >= 70
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                          : 'bg-gradient-to-r from-brand-500 to-brand-400'
                      }`}
                    style={{ width: `${supplierProfile.stats?.capacityUsage || 0}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-7 tabular-nums">
                  {supplierProfile.stats?.capacityUsage || 0}%
                </span>
              </div>

              {/* Availability Badge with Glow */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${supplierProfile.company?.status === 'ACTIVE'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : supplierProfile.company?.status === 'SUSPENDED'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${supplierProfile.company?.status === 'ACTIVE'
                    ? 'bg-green-500 animate-glow-pulse'
                    : supplierProfile.company?.status === 'SUSPENDED'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`} style={supplierProfile.company?.status === 'ACTIVE' ? { boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)' } : {}} />
                {supplierProfile.company?.status === 'ACTIVE' ? 'Ativa' : supplierProfile.company?.status === 'SUSPENDED' ? 'Suspensa' : 'Pendente'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation - área scrollável */}
      <nav className="flex-1 p-3 overflow-y-auto min-h-0" aria-label="Menu principal">
        {navGroups.map((group, groupIndex) => (
          <div key={group.id}>
            {/* Separador visual entre grupos (exceto primeiro) */}
            {groupIndex > 0 && (
              <div className="my-3 mx-3 border-t border-gray-200/50 dark:border-gray-700/50" />
            )}

            {/* Label do grupo (apenas quando não colapsado) */}
            {!collapsed && (
              <h3 className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.label}
              </h3>
            )}

            {/* Itens do grupo */}
            <div className="space-y-1">
              {group.items.map((item) => (
                <div key={item.id}>
                  {item.children ? (
                    <>
                      <CollapsedTooltip label={item.label} collapsed={collapsed}>
                        <button
                          onClick={() => toggleExpand(item.id)}
                          aria-expanded={expandedItems.includes(item.id)}
                          aria-controls={`submenu-${item.id}`}
                          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'
                            } px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 sidebar-item-hover transition-colors`}
                        >
                          <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                            {item.icon}
                            {!collapsed && item.label}
                          </span>
                          {!collapsed &&
                            (expandedItems.includes(item.id) ? (
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            ))}
                        </button>
                      </CollapsedTooltip>
                      {!collapsed && expandedItems.includes(item.id) && (
                        <div
                          id={`submenu-${item.id}`}
                          className="ml-8 mt-1 space-y-1 animate-fade-up"
                          role="menu"
                        >
                          {item.children.map((child) => (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              role="menuitem"
                              className={({ isActive }) =>
                                `block px-3 py-2 text-sm rounded-lg transition-all duration-200 ${isActive
                                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`
                              }
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <CollapsedTooltip label={item.label} collapsed={collapsed}>
                      <NavLink
                        to={item.path!}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `relative flex items-center ${collapsed ? 'justify-center' : 'gap-3'
                          } px-3 py-2.5 text-sm font-medium rounded-lg sidebar-item-hover transition-all duration-200 ${isActive
                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Active indicator bar */}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-brand-400 to-brand-600 rounded-r-full animate-slide-in-right" />
                            )}
                            <span className={`flex items-center ${collapsed ? '' : 'gap-3'} relative`}>
                              {item.icon}
                              {/* Badge for pending documents on Minhas Marcas */}
                              {item.id === 'marcas' && pendingDocsCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-bold text-white bg-orange-500 rounded-full">
                                  {pendingDocsCount > 9 ? '9+' : pendingDocsCount}
                                </span>
                              )}
                              {!collapsed && item.label}
                            </span>
                            {/* Badge also visible when not collapsed */}
                            {!collapsed && item.id === 'marcas' && pendingDocsCount > 0 && (
                              <span className="ml-auto flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-xs font-bold text-white bg-orange-500 rounded-full">
                                {pendingDocsCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </CollapsedTooltip>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

    </>
  );

  return (
    <>
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Pular para conteúdo principal
      </a>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Abrir menu de navegação"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-sidebar"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-lg shadow-card border border-gray-200/50 dark:border-gray-700/50 touch-feedback"
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 modal-backdrop z-40 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar - Glass Morphism */}
      <aside
        id="mobile-sidebar"
        aria-label="Navegação principal"
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 h-screen bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transform transition-transform duration-300 ease-spring ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Fechar menu"
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        </button>
        <NavContent collapsed={false} />
      </aside>

      {/* Desktop Sidebar - Glass Morphism */}
      <aside
        aria-label="Navegação principal"
        className={`hidden lg:flex h-screen bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex-col transition-all duration-300 ease-spring ${isCollapsed ? 'w-20' : 'w-72'
          }`}
      >
        <NavContent collapsed={isCollapsed} />
      </aside>
    </>
  );
};

export default PortalSidebar;
