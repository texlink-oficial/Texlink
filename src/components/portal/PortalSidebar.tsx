import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
} from 'lucide-react';

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
        id: 'capacidade',
        label: 'Capacidade',
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
        children: [
          { label: 'Depósitos', path: '/portal/financeiro/depositos' },
          { label: 'Dados Bancários', path: '/portal/financeiro/dados-bancarios' },
          { label: 'Frequência de Repasse', path: '/portal/financeiro/frequencia' },
          { label: 'Antecipação', path: '/portal/financeiro/antecipacao' },
        ],
      },
      {
        id: 'marcas',
        label: 'Minhas Marcas',
        icon: <Building2 className="h-5 w-5" />,
        path: '/portal/marcas',
      },
    ],
  },
  {
    id: 'recursos',
    label: 'Recursos',
    items: [
      {
        id: 'documentos',
        label: 'Documentos',
        icon: <FolderOpen className="h-5 w-5" />,
        path: '/portal/documentos',
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
  const [expandedItems, setExpandedItems] = useState<string[]>(['pedidos']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

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
            {/* Texlink Logo Icon */}
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-card">
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
                          className={`w-full flex items-center ${
                            collapsed ? 'justify-center' : 'justify-between'
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
                                `block px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                  isActive
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
                          `flex items-center ${
                            collapsed ? 'justify-center' : 'gap-3'
                          } px-3 py-2.5 text-sm font-medium rounded-lg sidebar-item-hover transition-all duration-200 ${
                            isActive
                              ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`
                        }
                      >
                        {item.icon}
                        {!collapsed && item.label}
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
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 h-screen bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transform transition-transform duration-300 ease-spring ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
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
        className={`hidden lg:flex h-screen bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex-col transition-all duration-300 ease-spring ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <NavContent collapsed={isCollapsed} />
      </aside>
    </>
  );
};

export default PortalSidebar;
