import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { teamService } from '../../services/team.service';
import {
  CompanyRole,
  TeamMember,
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
  ALL_COMPANY_ROLES,
} from '../../types/permissions';

interface CreateUserModalProps {
  companyId: string;
  onClose: () => void;
  onUserCreated: (member: TeamMember) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ companyId, onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    companyRole: 'VIEWER' as CompanyRole,
    isCompanyAdmin: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const newMember = await teamService.createUser(companyId, formData);
      onUserCreated(newMember);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <UserPlus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Criar Usuário</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm flex gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                required
                minLength={3}
                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
                className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full h-10 px-4 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="mt-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                Gerar senha segura automaticamente
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Função</label>
                <select
                  value={formData.companyRole}
                  onChange={e => setFormData(prev => ({ ...prev, companyRole: e.target.value as CompanyRole }))}
                  className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                >
                  {ALL_COMPANY_ROLES.map(role => (
                    <option key={role} value={role}>
                      {ROLE_NAMES[role]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                  {ROLE_DESCRIPTIONS[formData.companyRole]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 select-none cursor-pointer group">
              <input
                type="checkbox"
                id="isAdmin"
                checked={formData.isCompanyAdmin}
                onChange={e => setFormData(prev => ({ ...prev, isCompanyAdmin: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 focus:ring-offset-0 bg-white dark:bg-gray-800 transition-all cursor-pointer"
              />
              <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Definir como Administrador da Empresa
              </label>
            </div>

            {formData.isCompanyAdmin && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 text-amber-700 dark:text-amber-500 text-[11px] leading-relaxed">
                <strong>Atenção:</strong> Administradores têm acesso total a todas as funcionalidades, incluindo gestão financeira e de equipe.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </div>
              ) : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
