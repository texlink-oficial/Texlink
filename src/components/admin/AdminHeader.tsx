import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { NotificationBell } from '../notifications';
import { adminService } from '../../services';
import { authService } from '../../services/auth.service';
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
    Eye,
    X,
    Loader2,
    ChevronDown,
    Lock,
    Unlock,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface CompanyItem {
    id: string;
    tradeName: string;
    legalName: string;
    status: string;
}

export const AdminHeader: React.FC = () => {
    const { user, logout, viewAs, enterViewAs, exitViewAs, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { darkMode, toggleDarkMode } = useTheme();
    const [showViewAsMenu, setShowViewAsMenu] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState<'BRAND' | 'SUPPLIER' | null>(null);
    const [companies, setCompanies] = useState<CompanyItem[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [companySearch, setCompanySearch] = useState('');
    const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
    const [masterPassword, setMasterPassword] = useState('');
    const [superAdminLoading, setSuperAdminLoading] = useState(false);
    const [superAdminError, setSuperAdminError] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowViewAsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectRole = async (role: 'BRAND' | 'SUPPLIER') => {
        setShowViewAsMenu(false);
        setShowCompanyModal(role);
        setLoadingCompanies(true);
        setCompanySearch('');
        try {
            const data = role === 'SUPPLIER'
                ? await adminService.getSuppliers('ACTIVE')
                : await adminService.getBrands('ACTIVE');
            setCompanies(Array.isArray(data) ? data : []);
        } catch {
            setCompanies([]);
        } finally {
            setLoadingCompanies(false);
        }
    };

    const handleSelectCompany = (company: CompanyItem) => {
        const role = showCompanyModal!;
        setShowCompanyModal(null);
        enterViewAs(role, company.id, company.tradeName || company.legalName);
        navigate(role === 'SUPPLIER' ? '/portal/inicio' : '/brand/inicio');
    };

    const handleExitViewAs = () => {
        exitViewAs();
        navigate('/admin');
    };

    const handleToggleSuperAdmin = async () => {
        setSuperAdminLoading(true);
        setSuperAdminError('');
        try {
            await authService.toggleSuperAdmin(masterPassword);
            await refreshUser();
            setShowSuperAdminModal(false);
            setMasterPassword('');
        } catch (err: any) {
            setSuperAdminError(err?.response?.data?.message || err?.message || 'Senha incorreta');
        } finally {
            setSuperAdminLoading(false);
        }
    };

    const filteredCompanies = companies.filter(c => {
        const search = companySearch.toLowerCase();
        return (c.tradeName?.toLowerCase().includes(search) || c.legalName?.toLowerCase().includes(search));
    });

    const navItems = [
        { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin' },
        { label: 'Facções', icon: <Factory className="w-4 h-4" />, path: '/admin/suppliers' },
        { label: 'Marcas', icon: <Building2 className="w-4 h-4" />, path: '/admin/brands' },
        { label: 'Pedidos', icon: <Package className="w-4 h-4" />, path: '/admin/orders' },
        { label: 'Usuários', icon: <Users className="w-4 h-4" />, path: '/admin/users' },
    ];

    const isSuperAdmin = user?.isSuperAdmin;

    return (
        <>
            <header className="bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-white/[0.06] backdrop-blur-xl sticky top-0 z-50" style={viewAs ? { top: '40px' } : undefined}>
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
                            {/* View As button (superAdmin only) */}
                            {isSuperAdmin && !viewAs && (
                                <div className="relative" ref={menuRef}>
                                    <Tooltip content="Ver como">
                                        <button
                                            onClick={() => setShowViewAsMenu(!showViewAsMenu)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span className="hidden sm:inline">Ver como</span>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </Tooltip>

                                    {showViewAsMenu && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg py-1 z-50">
                                            <button
                                                onClick={() => handleSelectRole('SUPPLIER')}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <Factory className="w-4 h-4 text-purple-500" />
                                                Facção
                                            </button>
                                            <button
                                                onClick={() => handleSelectRole('BRAND')}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <Building2 className="w-4 h-4 text-blue-500" />
                                                Marca
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Exit View As button */}
                            {viewAs && (
                                <button
                                    onClick={handleExitViewAs}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                    Sair da Simulação
                                </button>
                            )}

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

                                <Tooltip content={user?.isSuperAdmin ? 'Desativar SuperAdmin' : 'Ativar SuperAdmin'}>
                                    <button
                                        onClick={() => { setShowSuperAdminModal(true); setSuperAdminError(''); setMasterPassword(''); }}
                                        className={`p-2 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] ${
                                            user?.isSuperAdmin
                                                ? 'text-amber-500 hover:text-amber-600'
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {user?.isSuperAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                    </button>
                                </Tooltip>

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

            {/* Company Selection Modal */}
            {showCompanyModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                {showCompanyModal === 'SUPPLIER' ? (
                                    <Factory className="w-5 h-5 text-purple-500" />
                                ) : (
                                    <Building2 className="w-5 h-5 text-blue-500" />
                                )}
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Selecionar {showCompanyModal === 'SUPPLIER' ? 'Facção' : 'Marca'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowCompanyModal(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-200 dark:border-white/10">
                            <input
                                type="text"
                                placeholder="Buscar empresa..."
                                value={companySearch}
                                onChange={(e) => setCompanySearch(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-gray-900 dark:text-white placeholder-gray-400"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingCompanies ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                                </div>
                            ) : filteredCompanies.length === 0 ? (
                                <p className="text-center text-gray-400 py-12 text-sm">
                                    Nenhuma empresa encontrada
                                </p>
                            ) : (
                                filteredCompanies.map((company) => (
                                    <button
                                        key={company.id}
                                        onClick={() => handleSelectCompany(company)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            {showCompanyModal === 'SUPPLIER' ? (
                                                <Factory className="w-4 h-4 text-purple-500" />
                                            ) : (
                                                <Building2 className="w-4 h-4 text-blue-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {company.tradeName || company.legalName}
                                            </p>
                                            {company.tradeName && company.legalName && company.tradeName !== company.legalName && (
                                                <p className="text-xs text-gray-400 truncate">{company.legalName}</p>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SuperAdmin Password Modal */}
            {showSuperAdminModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <Shield className="w-5 h-5 text-amber-500" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {user?.isSuperAdmin ? 'Desativar' : 'Ativar'} SuperAdmin
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowSuperAdminModal(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => { e.preventDefault(); handleToggleSuperAdmin(); }}
                            className="p-5 space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Senha Master
                                </label>
                                <input
                                    type="password"
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    placeholder="Digite a senha master..."
                                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-gray-900 dark:text-white placeholder-gray-400"
                                    autoFocus
                                />
                            </div>

                            {superAdminError && (
                                <p className="text-sm text-red-500">{superAdminError}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSuperAdminModal(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!masterPassword || superAdminLoading}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {superAdminLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {user?.isSuperAdmin ? 'Desativar' : 'Ativar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
