import React, { useState } from 'react';
import { X, Edit3, ShieldCheck } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-900 border border-brand-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-800 rounded-lg">
              <Edit3 className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Editar Membro</h2>
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

          {/* Member Info */}
          <div className="flex items-center gap-3 p-3 bg-brand-800/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-brand-800 flex items-center justify-center text-brand-400 font-medium text-lg">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{member.name}</span>
                {member.isCompanyAdmin && (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <span className="text-gray-400 text-sm">{member.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              value={companyRole}
              onChange={e => setCompanyRole(e.target.value as CompanyRole)}
              className="w-full px-4 py-2 bg-brand-800/50 border border-brand-700 rounded-lg text-white focus:outline-none focus:border-brand-500"
            >
              {ALL_COMPANY_ROLES.map(role => (
                <option key={role} value={role}>
                  {ROLE_NAMES[role]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{ROLE_DESCRIPTIONS[companyRole]}</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isCompanyAdmin}
              onChange={e => setIsCompanyAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-brand-700 bg-brand-800 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-300">
              Administrador da Empresa
            </label>
          </div>

          {isCompanyAdmin && !member.isCompanyAdmin && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-sm">
              Administradores têm acesso total a todas as funcionalidades, incluindo gestão de equipe e
              permissões.
            </div>
          )}

          {!isCompanyAdmin && member.isCompanyAdmin && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              Atenção: Remover o status de administrador limitará o acesso deste usuário às permissões do
              role selecionado.
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
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;
