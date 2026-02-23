import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Users, Shield, Building2, Factory,
    Search, Plus, MoreVertical, Loader2,
    ChevronRight, Filter, RefreshCw,
    Edit3, KeyRound, UserX, UserCheck, X
} from 'lucide-react';
import { adminService, AdminUser } from '../../services/admin.service';
import { authService } from '../../services/auth.service';
import { useToast } from '../../contexts/ToastContext';
import CreateUserModal from '../../components/admin/CreateUserModal';
import EditUserModal from '../../components/admin/EditUserModal';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [openActionId, setOpenActionId] = useState<string | null>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
    const [superAdminTarget, setSuperAdminTarget] = useState<AdminUser | null>(null);
    const [masterPassword, setMasterPassword] = useState('');
    const [superAdminLoading, setSuperAdminLoading] = useState(false);
    const [superAdminError, setSuperAdminError] = useState('');
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    const actionBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);
    const toast = useToast();

    // Close dropdown on click outside
    useEffect(() => {
        if (!openActionId) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenActionId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openActionId]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (user: AdminUser) => {
        try {
            await adminService.updateUser(user.id, { isActive: !user.isActive });
            toast.success('Status atualizado', `Usuário ${!user.isActive ? 'ativado' : 'desativado'} com sucesso`);
            loadUsers();
        } catch (error) {
            toast.error('Erro', 'Não foi possível atualizar o status');
        }
    };

    const handleOpenSuperAdminModal = (user: AdminUser) => {
        setSuperAdminTarget(user);
        setMasterPassword('');
        setSuperAdminError('');
        setShowSuperAdminModal(true);
    };

    const handleToggleSuperAdmin = async () => {
        if (!superAdminTarget) return;
        setSuperAdminLoading(true);
        setSuperAdminError('');
        try {
            await authService.toggleSuperAdmin(masterPassword, superAdminTarget.id);
            toast.success('SuperAdmin atualizado', `SuperAdmin ${!superAdminTarget.isSuperAdmin ? 'ativado' : 'desativado'} para ${superAdminTarget.name}`);
            setShowSuperAdminModal(false);
            setSuperAdminTarget(null);
            setMasterPassword('');
            loadUsers();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            setSuperAdminError(error?.response?.data?.message || error?.message || 'Senha incorreta');
        } finally {
            setSuperAdminLoading(false);
        }
    };

    const handleOpenDropdown = useCallback((userId: string) => {
        if (openActionId === userId) {
            setOpenActionId(null);
            return;
        }

        const btn = actionBtnRefs.current[userId];
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 200; // approximate

        const style: React.CSSProperties = {
            position: 'fixed',
            right: window.innerWidth - rect.right,
            zIndex: 9999,
        };

        if (spaceBelow < dropdownHeight) {
            // Open upward
            style.bottom = window.innerHeight - rect.top + 4;
        } else {
            // Open downward
            style.top = rect.bottom + 4;
        }

        setDropdownStyle(style);
        setOpenActionId(userId);
    }, [openActionId]);

    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query);
        const matchesRole = !selectedRole || user.role === selectedRole;
        const matchesStatus = !selectedStatus ||
            (selectedStatus === 'active' && user.isActive) ||
            (selectedStatus === 'inactive' && !user.isActive);
        return matchesSearch && matchesRole && matchesStatus;
    });

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'ADMIN').length,
        brands: users.filter(u => u.role === 'BRAND').length,
        suppliers: users.filter(u => u.role === 'SUPPLIER').length,
    };

    const activeUser = openActionId ? filteredUsers.find(u => u.id === openActionId) : null;

    return (
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-sky-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Usuários</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white font-display">{stats.total}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                                <Shield className="w-5 h-5 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admins</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white font-display">{stats.admins}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marcas</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white font-display">{stats.brands}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                <Factory className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Facções</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white font-display">{stats.suppliers}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Usuários</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Gerencie todos os usuários da plataforma</p>
                    </div>
                    <button
                        onClick={() => setShowCreateUser(true)}
                        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 font-bold rounded-xl shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Usuário
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all placeholder:text-gray-400 font-medium"
                        />
                    </div>

                    <div className="relative min-w-[180px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all appearance-none cursor-pointer font-medium"
                        >
                            <option value="">Todos os tipos</option>
                            <option value="ADMIN">Admin</option>
                            <option value="BRAND">Marca</option>
                            <option value="SUPPLIER">Facção</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                    </div>

                    <div className="relative min-w-[180px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all appearance-none cursor-pointer font-medium"
                        >
                            <option value="">Todos os status</option>
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                    </div>

                    <button
                        onClick={loadUsers}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-500 hover:text-sky-500 transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-medium animate-pulse">Carregando usuários...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-3xl p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-white/[0.02] rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Nenhum usuário encontrado</h3>
                        <p className="text-gray-500 max-w-sm mx-auto font-medium">Não encontramos resultados para os filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-3xl shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                                        <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresas</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Criado em</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                                    {filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</span>
                                                    {user.isSuperAdmin && (
                                                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[9px] font-bold uppercase">SA</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{user.email}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <RoleBadge role={user.role} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge isActive={user.isActive} />
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.companyUsers && user.companyUsers.length > 0
                                                    ? <div className="flex flex-wrap gap-1.5">
                                                        {user.companyUsers.map(cu => (
                                                            <span key={cu.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">
                                                                {cu.company.tradeName || '—'}
                                                                <span className={`text-[9px] font-bold uppercase ${cu.isCompanyAdmin ? 'text-sky-500' : 'text-gray-400'}`}>
                                                                    {cu.isCompanyAdmin ? 'admin' : 'user'}
                                                                </span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    : <span className="text-sm text-gray-400">—</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    ref={(el) => { actionBtnRefs.current[user.id] = el; }}
                                                    onClick={(e) => { e.stopPropagation(); handleOpenDropdown(user.id); }}
                                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating dropdown menu - rendered via portal-like fixed positioning */}
            {openActionId && activeUser && (
                <div ref={dropdownRef} style={dropdownStyle} className="w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-xl overflow-hidden">
                    <button
                        onClick={() => {
                            setSelectedUser(activeUser);
                            setShowEditUser(true);
                            setOpenActionId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                        <Edit3 className="w-4 h-4" />
                        Editar
                    </button>
                    <button
                        onClick={() => {
                            setSelectedUser(activeUser);
                            setShowResetPassword(true);
                            setOpenActionId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                        <KeyRound className="w-4 h-4" />
                        Redefinir Senha
                    </button>
                    {activeUser.role === 'ADMIN' && (
                        <button
                            onClick={() => {
                                handleOpenSuperAdminModal(activeUser);
                                setOpenActionId(null);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                                activeUser.isSuperAdmin
                                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                                    : 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10'
                            }`}
                        >
                            <Shield className="w-4 h-4" />
                            {activeUser.isSuperAdmin ? 'Remover SuperAdmin' : 'Tornar SuperAdmin'}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            handleToggleStatus(activeUser);
                            setOpenActionId(null);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeUser.isActive
                                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                    >
                        {activeUser.isActive ? (
                            <>
                                <UserX className="w-4 h-4" />
                                Desativar
                            </>
                        ) : (
                            <>
                                <UserCheck className="w-4 h-4" />
                                Ativar
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Modals */}
            {showCreateUser && (
                <CreateUserModal
                    onClose={() => setShowCreateUser(false)}
                    onSuccess={() => { setShowCreateUser(false); loadUsers(); }}
                />
            )}
            {showEditUser && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => { setShowEditUser(false); setSelectedUser(null); }}
                    onSuccess={() => { setShowEditUser(false); setSelectedUser(null); loadUsers(); }}
                />
            )}
            {showResetPassword && selectedUser && (
                <ResetPasswordModal
                    user={selectedUser}
                    onClose={() => { setShowResetPassword(false); setSelectedUser(null); }}
                    onSuccess={() => { setShowResetPassword(false); setSelectedUser(null); }}
                />
            )}

            {/* SuperAdmin Toggle Modal */}
            {showSuperAdminModal && superAdminTarget && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <Shield className="w-5 h-5 text-amber-500" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {superAdminTarget.isSuperAdmin ? 'Remover' : 'Tornar'} SuperAdmin
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {superAdminTarget.isSuperAdmin
                                    ? `Remover SuperAdmin de "${superAdminTarget.name}"?`
                                    : `Tornar "${superAdminTarget.name}" SuperAdmin?`
                                }
                            </p>

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
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
        ADMIN: { label: 'Admin', bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
        BRAND: { label: 'Marca', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
        SUPPLIER: { label: 'Facção', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    };

    const { label, bg, text } = config[role] || config.ADMIN;

    return (
        <span className={`px-2.5 py-1 ${bg} ${text} rounded-full text-[10px] font-bold uppercase tracking-widest`}>
            {label}
        </span>
    );
};

const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    if (isActive) {
        return (
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
            </span>
        );
    }

    return (
        <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Inativo
        </span>
    );
};

export default UsersPage;
