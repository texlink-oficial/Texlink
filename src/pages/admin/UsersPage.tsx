import React, { useEffect, useState } from 'react';
import {
    Users, Shield, Building2, Factory,
    Search, Plus, MoreVertical, Loader2,
    ChevronRight, Filter, RefreshCw,
    Edit3, KeyRound, UserX, UserCheck
} from 'lucide-react';
import { adminService, AdminUser } from '../../services/admin.service';
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
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showEditUser, setShowEditUser] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    const toast = useToast();

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

    const roleLabels: Record<string, string> = {
        ADMIN: 'Admin',
        BRAND: 'Marca',
        SUPPLIER: 'Facção',
    };

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
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-3xl shadow-sm overflow-hidden">
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
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</span>
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
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                    {user.companyUsers && user.companyUsers.length > 0
                                                        ? user.companyUsers.map(cu => cu.company.tradeName || '—').join(', ')
                                                        : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenActionId(openActionId === user.id ? null : user.id)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    {openActionId === user.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl shadow-xl z-20 overflow-hidden">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUser(user);
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
                                                                    setSelectedUser(user);
                                                                    setShowResetPassword(true);
                                                                    setOpenActionId(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                                                            >
                                                                <KeyRound className="w-4 h-4" />
                                                                Redefinir Senha
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleToggleStatus(user);
                                                                    setOpenActionId(null);
                                                                }}
                                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                                                                    user.isActive
                                                                        ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                                                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                                                }`}
                                                            >
                                                                {user.isActive ? (
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
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

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
