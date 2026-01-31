import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    Home,
    BarChart3,
    FileText,
    Package,
    DollarSign,
    LogOut,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Menu,
    X,
    User,
    Users,
    Bell,
    Gauge,
    PanelLeftClose,
    PanelLeft,
    Moon,
    Sun,
    Settings,
    Building2,
    FolderOpen,
    Gift,
    GraduationCap
} from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path?: string;
    children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
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
        id: 'desempenho',
        label: 'Desempenho',
        icon: <BarChart3 className="h-5 w-5" />,
        path: '/portal/desempenho',
    },
    {
        id: 'relatorios',
        label: 'Relatórios',
        icon: <FileText className="h-5 w-5" />,
        path: '/portal/relatorios',
    },
    {
        id: 'capacidade',
        label: 'Capacidade',
        icon: <Gauge className="h-5 w-5" />,
        path: '/portal/capacidade',
    },
    {
        id: 'documentos',
        label: 'Documentos',
        icon: <FolderOpen className="h-5 w-5" />,
        path: '/portal/documentos',
    },
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
    {
        id: 'equipe',
        label: 'Equipe',
        icon: <Users className="h-5 w-5" />,
        path: '/portal/equipe',
    },
];


export const PortalSidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [expandedItems, setExpandedItems] = useState<string[]>(['pedidos', 'financeiro']);
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
        setExpandedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
        <>
            {/* Logo / Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    {/* Texlink Logo Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                        <svg
                            className="h-6 w-6 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h1 className="font-bold text-gray-900 dark:text-white whitespace-nowrap">Texlink</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Portal do Parceiro</p>
                        </div>
                    )}
                </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user?.name || 'Parceiro'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative flex-shrink-0">
                                <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <div key={item.id}>
                        {item.children ? (
                            <>
                                <button
                                    onClick={() => toggleExpand(item.id)}
                                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <span className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                                        {item.icon}
                                        {!collapsed && item.label}
                                    </span>
                                    {!collapsed && (
                                        expandedItems.includes(item.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )
                                    )}
                                </button>
                                {!collapsed && expandedItems.includes(item.id) && (
                                    <div className="ml-8 mt-1 space-y-1">
                                        {item.children.map((child) => (
                                            <NavLink
                                                key={child.path}
                                                to={child.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `block px-3 py-2 text-sm rounded-lg transition-colors ${isActive
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
                            <NavLink
                                to={item.path!}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`
                                }
                                title={collapsed ? item.label : undefined}
                            >
                                {item.icon}
                                {!collapsed && item.label}
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                {/* Theme Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                    title={collapsed ? (darkMode ? 'Modo claro' : 'Modo escuro') : undefined}
                >
                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    {!collapsed && (darkMode ? 'Modo Claro' : 'Modo Escuro')}
                </button>

                {/* Notifications */}
                <button
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative`}
                    title={collapsed ? 'Notificações' : undefined}
                >
                    <Bell className="h-5 w-5" />
                    {!collapsed && 'Notificações'}
                    <span className="absolute top-2 left-7 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Settings */}
                <button
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                    title={collapsed ? 'Configurações' : undefined}
                >
                    <Settings className="h-5 w-5" />
                    {!collapsed && 'Configurações'}
                </button>

                {/* Collapse Toggle (Desktop only) */}
                <button
                    onClick={toggleCollapse}
                    className={`hidden lg:flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                    title={collapsed ? 'Expandir' : 'Recolher'}
                >
                    {collapsed ? (
                        <PanelLeft className="h-5 w-5" />
                    ) : (
                        <>
                            <PanelLeftClose className="h-5 w-5" />
                            <span>Recolher menu</span>
                        </>
                    )}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
                    title={collapsed ? 'Sair' : undefined}
                >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && 'Sair'}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
            >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar - Always expanded */}
            <aside
                className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <NavContent collapsed={false} />
            </aside>

            {/* Desktop Sidebar - Collapsible */}
            <aside
                className={`hidden lg:flex bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'
                    }`}
            >
                <NavContent collapsed={isCollapsed} />
            </aside>
        </>
    );
};

export default PortalSidebar;
