import React, { useState } from 'react';
import { X, Edit3, ShieldAlert } from 'lucide-react';
import { adminService, AdminUser } from '../../services/admin.service';
import { useToast } from '../../contexts/ToastContext';

interface EditUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const toast = useToast();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<'ADMIN' | 'BRAND' | 'SUPPLIER'>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function validate(): string | null {
    if (name.trim().length < 3) return 'O nome deve ter pelo menos 3 caracteres.';
    if (!email.includes('@')) return 'Informe um email valido.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await adminService.updateUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        role,
        isActive,
      });
      toast.success('Usuario atualizado', 'Dados do usuario atualizados com sucesso');
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar usuario.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-sky-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar Usuario</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              required
              className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>

          {/* Tipo / Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'BRAND' | 'SUPPLIER')}
              className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all appearance-none cursor-pointer"
            >
              <option value="ADMIN">Admin</option>
              <option value="BRAND">Marca</option>
              <option value="SUPPLIER">Faccao</option>
            </select>
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-10 w-full items-center justify-between rounded-lg border px-4 transition-all ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {isActive ? 'Ativo' : 'Inativo'}
              </span>
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Empresas Vinculadas (read-only) */}
          {user.companyUsers && user.companyUsers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Empresas Vinculadas</label>
              <div className="space-y-2">
                {user.companyUsers.map((cu) => (
                  <div
                    key={cu.id}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700"
                  >
                    {cu.company.tradeName || 'Sem nome'}
                    <span className="text-xs text-gray-400 ml-2">({cu.company.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Alteracoes de tipo podem afetar as permissoes do usuario no sistema.</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
