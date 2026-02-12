import React, { useState, useEffect } from 'react';
import {
    User,
    Building2,
    Calendar,
    Shield,
    Loader2,
    Check,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { profileService } from '../../services/profile.service';
import { ROLE_NAMES, CompanyRole } from '../../types/permissions';

const ProfileSection: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
        }
    }, [user]);

    if (!user) return null;

    // Pick the companyUser whose company type matches the user's role;
    // fall back to first association for ADMIN or single-company users
    const companyUser =
        user.companyUsers?.find((cu) => cu.company?.type === user.role) ||
        user.companyUsers?.[0];
    const company = companyUser?.company;
    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const hasChanges = name !== user.name || email !== user.email;

    const handleSave = async () => {
        if (!hasChanges) return;

        setSaving(true);
        setError('');
        setSuccess(false);

        try {
            const data: { name?: string; email?: string } = {};
            if (name !== user.name) data.name = name;
            if (email !== user.email) data.email = email;

            await profileService.updateProfile(data);
            await refreshUser();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Erro ao atualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    const companyTypeLabel = company?.type === 'BRAND' ? 'Marca' : company?.type === 'SUPPLIER' ? 'Facção' : company?.type;

    const userRoleLabel = (role: string) => {
        const map: Record<string, string> = {
            BRAND: 'Marca',
            SUPPLIER: 'Facção',
            ADMIN: 'Administrador',
        };
        return map[role] || role;
    };

    const statusLabel = (status: string) => {
        const map: Record<string, { label: string; color: string }> = {
            APPROVED: { label: 'Aprovada', color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
            PENDING: { label: 'Pendente', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' },
            PENDING_ONBOARDING: { label: 'Em Onboarding', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
            REJECTED: { label: 'Rejeitada', color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' },
            SUSPENDED: { label: 'Suspensa', color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' },
        };
        return map[status] || { label: status, color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                    <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações Pessoais</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gerencie suas informações pessoais
                    </p>
                </div>
            </div>

            {/* Success / Error alerts */}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Perfil atualizado com sucesso!
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Avatar + Form */}
            <div className="flex flex-col sm:flex-row gap-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                    {company?.logoUrl ? (
                        <img
                            src={company.logoUrl}
                            alt={company.tradeName || ''}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-brand-600 dark:bg-brand-500 flex items-center justify-center text-white text-2xl font-bold">
                            {initials}
                        </div>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{userRoleLabel(user.role)}</span>
                </div>

                {/* Form */}
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Company Card */}
            {company && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Empresa Vinculada</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Nome</span>
                            <p className="text-sm text-gray-900 dark:text-white">{company.tradeName}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Tipo</span>
                            <p className="text-sm text-gray-900 dark:text-white">{companyTypeLabel}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                            <p>
                                <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusLabel(company.status).color}`}>
                                    {statusLabel(company.status).label}
                                </span>
                            </p>
                        </div>
                        {companyUser?.role && (
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Função</span>
                                <p className="text-sm text-gray-900 dark:text-white">
                                    {ROLE_NAMES[companyUser.role as CompanyRole] || companyUser.role}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Account Info Card */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Informações da Conta</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {user.createdAt && (
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Membro desde</span>
                            <p className="text-sm text-gray-900 dark:text-white flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>
                    )}
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Status da conta</span>
                        <p>
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${user.isActive
                                ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                                : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                                }`}>
                                {user.isActive ? 'Ativa' : 'Inativa'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${hasChanges && !saving
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        'Salvar Alterações'
                    )}
                </button>
            </div>
        </div>
    );
};

export default ProfileSection;
