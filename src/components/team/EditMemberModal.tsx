import React, { useState } from 'react';
import { X, Edit3, ShieldCheck, ShieldAlert } from 'lucide-react';
import { teamService } from '../../services/team.service';
import {
  CompanyRole,
  TeamMember,
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
  ALL_COMPANY_ROLES,
} from '../../types/permissions';

interface EditMemberModalProps {
  companyId: string;
  member: TeamMember;
  onClose: () => void;
  onMemberUpdated: (member: TeamMember) => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  companyId,
  member,
  onClose,
  onMemberUpdated,
}) => {
  const [companyRole, setCompanyRole] = useState<CompanyRole>(member.companyRole);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(member.isCompanyAdmin);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const updatedMember = await teamService.updateMember(companyId, member.id, {
        companyRole,
        isCompanyAdmin,
      });
      onMemberUpdated(updatedMember);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar membro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <Edit3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar Membro</h2>
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

          {/* Member Info Card */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-xl border-2 border-white dark:border-gray-800 shadow-sm">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-gray-900 dark:text-white font-bold truncate">{member.name}</span>
                {member.isCompanyAdmin && (
                  <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" title="Administrador" />
                )}
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm truncate block">{member.email}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Função</label>
              <div className="space-y-3">
                <select
                  value={companyRole}
                  onChange={e => setCompanyRole(e.target.value as CompanyRole)}
                  className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none cursor-pointer"
                >
                  {ALL_COMPANY_ROLES.map(role => (
                    <option key={role} value={role}>
                      {ROLE_NAMES[role]}
                    </option>
                  ))}
                </select>
                <div className="p-3 bg-brand-50/30 dark:bg-brand-900/10 border border-brand-100/50 dark:border-brand-900/20 rounded-xl">
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-brand-700 dark:text-brand-400 block mb-0.5">Descrição do Cargo:</strong>
                    {ROLE_DESCRIPTIONS[companyRole]}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 select-none cursor-pointer group">
              <input
                type="checkbox"
                id="isAdmin"
                checked={isCompanyAdmin}
                onChange={e => setIsCompanyAdmin(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 focus:ring-offset-0 bg-white dark:bg-gray-800 transition-all cursor-pointer"
              />
              <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Administrador da Empresa
              </label>
            </div>

            {isCompanyAdmin && !member.isCompanyAdmin && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 text-amber-700 dark:text-amber-500 text-[11px] leading-relaxed">
                <strong>Atenção:</strong> Ao tornar este usuário um administrador, ele terá acesso total a todas as áreas, incluindo pagamentos e configurações de equipe.
              </div>
            )}

            {!isCompanyAdmin && member.isCompanyAdmin && (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-red-700 dark:text-red-500 text-[11px] leading-relaxed">
                <strong>Atenção:</strong> Remover o status de administrador limitará o acesso deste usuário apenas às permissões da função selecionada acima.
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
                  Salvando...
                </div>
              ) : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;
