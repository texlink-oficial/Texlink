import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { NotificationBell } from '../notifications';
import {
    Shield,
    Settings,
    LogOut,
    Sun,
    Moon,
    Factory,
    Building2,
    Package,
    LayoutDashboard,
    Search,
    Users,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

export const AdminHeader: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { darkMode, toggleDarkMode } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin' },
        { label: 'Facções', icon: <Factory className="w-4 h-4" />, path: '/admin/suppliers' },
        { label: 'Marcas', icon: <Building2 className="w-4 h-4" />, path: '/admin/brands' },
        { label: 'Pedidos', icon: <Package className="w-4 h-4" />, path: '/admin/orders' },
        { label: 'Usuários', icon: <Users className="w-4 h-4" />, path: '/admin/users' },
    ];

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-white/[0.06] backdrop-blur-xl sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Logo & Nav */}
                    <div className="flex items-center gap-8">
                        <Link to="/admin" className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-sky-500/30 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Admin</h1>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wider uppercase">TEXLINK</p>
                            </div>
                        </Link>

                        <nav className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/admin'}
                                    className={({ isActive }) => `
                                        flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all
                                        ${isActive
                                            ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white'
                                        }
                                    `}
                                >
                                    {item.icon}
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Search trigger (stub) */}
                        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 dark:bg-white/[0.05] border border-transparent hover:border-gray-200 dark:hover:border-white/10 rounded-lg transition-all">
                            <Search className="w-4 h-4" />
                            <span>Buscar...</span>
                            <span className="text-[10px] bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10">⌘K</span>
                        </button>

                        <div className="flex items-center gap-1 sm:gap-2">
                            <NotificationBell />

                            <Tooltip content={darkMode ? 'Modo Claro' : 'Modo Escuro'}>
                                <button
                                    onClick={toggleDarkMode}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                                >
                                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </button>
                            </Tooltip>

                            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />

                            <Tooltip content="Configurações">
                                <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05]">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </Tooltip>

                            <Tooltip content="Sair">
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
