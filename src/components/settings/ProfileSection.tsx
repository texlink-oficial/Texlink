import React, { useState, useEffect } from 'react';
import {
    User,
    Building2,
    Calendar,
    Mail,
    Loader2,
    Check,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { profileService } from '../../services/profile.service';

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

    const companyStatusLabel = (status: string) => {
        const map: Record<string, { label: string; color: string }> = {
            ACTIVE: { label: 'Ativa', color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
            PENDING: { label: 'Pendente', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' },
            SUSPENDED: { label: 'Suspensa', color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' },
        };
        return map[status] || { label: status, color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30' };
    };

    const memberSince = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })
        : null;

    return (
        <div className="space-y-6">
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

            {/* Profile Header Card */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Avatar */}
                    {company?.logoUrl ? (
                        <img
                            src={company.logoUrl}
                            alt={company.tradeName || ''}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 flex-shrink-0"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-brand-600 dark:bg-brand-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            {initials}
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {company?.tradeName || user.name}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                            {company && (
                                <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${companyStatusLabel(company.status).color}`}>
                                    {companyStatusLabel(company.status).label}
                                </span>
                            )}
                            {memberSince && (
                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    Membro desde {memberSince}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Editable Fields */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Dados Pessoais</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                            Nome
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-sm"
                        />
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-5">
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${hasChanges && !saving
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

            {/* Company Info (read-only) */}
            {company && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Empresa</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome Fantasia</span>
                            <p className="text-sm text-gray-900 dark:text-white">{company.tradeName}</p>
                        </div>
                        <div>
                            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</span>
                            <p className="text-sm text-gray-900 dark:text-white">
                                {company.type === 'BRAND' ? 'Marca' : company.type === 'SUPPLIER' ? 'Facção' : company.type}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSection;
