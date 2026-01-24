import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-900 border border-brand-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-800 rounded-lg">
              <UserPlus className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Criar Usuário</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-brand-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome completo"
              required
              minLength={3}
              className="w-full px-4 py-2 bg-brand-800/50 border border-brand-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
              required
              className="w-full px-4 py-2 bg-brand-800/50 border border-brand-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Senha"
                required
                minLength={6}
                className="w-full px-4 py-2 pr-20 bg-brand-800/50 border border-brand-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="mt-1 text-xs text-brand-400 hover:text-brand-300"
            >
              Gerar senha aleatória
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              value={formData.companyRole}
              onChange={e => setFormData(prev => ({ ...prev, companyRole: e.target.value as CompanyRole }))}
              className="w-full px-4 py-2 bg-brand-800/50 border border-brand-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
            >
              {ALL_COMPANY_ROLES.map(role => (
                <option key={role} value={role}>
                  {ROLE_NAMES[role]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{ROLE_DESCRIPTIONS[formData.companyRole]}</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isAdmin"
              checked={formData.isCompanyAdmin}
              onChange={e => setFormData(prev => ({ ...prev, isCompanyAdmin: e.target.checked }))}
              className="w-4 h-4 rounded border-brand-700 bg-brand-800 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-300">
              Definir como Administrador da Empresa
            </label>
          </div>

          {formData.isCompanyAdmin && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-sm">
              Administradores têm acesso total a todas as funcionalidades, incluindo gestão de equipe e
              permissões.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
