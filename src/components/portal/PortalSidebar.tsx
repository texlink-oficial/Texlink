import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    Home,
    BarChart3,
    FileText,
    Package,
    DollarSign,
    Wallet,
    Building2,
    Calendar,
    Sparkles,
    LogOut,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    User,
    Bell
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
        id: 'pedidos',
        label: 'Pedidos',
        icon: <Package className="h-5 w-5" />,
        path: '/portal/pedidos',
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
];

export const PortalSidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [expandedItems, setExpandedItems] = useState<string[]>(['financeiro']);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleExpand = (id: string) => {
        setExpandedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const NavContent = () => (
        <>
            {/* Logo / Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">T</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 dark:text-white">Portal do Parceiro</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Texlink</p>
                    </div>
                </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user?.name || 'Parceiro'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user?.email}
                        </p>
                    </div>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative">
                        <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
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
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <span className="flex items-center gap-3">
                                        {item.icon}
                                        {item.label}
                                    </span>
                                    {expandedItems.includes(item.id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </button>
                                {expandedItems.includes(item.id) && (
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
                                    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Sair
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

            {/* Mobile Sidebar */}
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
                <NavContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col">
                <NavContent />
            </aside>
        </>
    );
};

export default PortalSidebar;
