import React, { useState } from 'react';
import { X, Mail, Copy, Check } from 'lucide-react';
import { teamService } from '../../services/team.service';
import {
  CompanyRole,
  Invitation,
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
  ALL_COMPANY_ROLES,
} from '../../types/permissions';

interface InviteUserModalProps {
  companyId: string;
  onClose: () => void;
  onInviteSent: (invitation: Invitation) => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ companyId, onClose, onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [companyRole, setCompanyRole] = useState<CompanyRole>('VIEWER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentInvitation, setSentInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const invitation = await teamService.inviteUser(companyId, { email, companyRole });
      setSentInvitation(invitation);
      onInviteSent(invitation);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar convite');
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (sentInvitation) {
      navigator.clipboard.writeText(`${window.location.origin}${sentInvitation.inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-900 border border-brand-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-800 rounded-lg">
              <Mail className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Convidar por Email</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-brand-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {sentInvitation ? (
            // Success state
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Convite Enviado!</h3>
              <p className="text-gray-400 text-sm mb-4">
                Um convite foi criado para <strong className="text-white">{sentInvitation.email}</strong>
              </p>

              <div className="bg-brand-800/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-2">Link do convite:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${sentInvitation.inviteUrl}`}
                    className="flex-1 bg-transparent text-sm text-gray-300 outline-none truncate"
                  />
                  <button
                    onClick={copyLink}
                    className="p-2 text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                O convite expira em 7 dias. Você pode copiar o link acima e enviar diretamente para o usuário.
              </p>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                  className="w-full px-4 py-2 bg-brand-800/50 border border-brand-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                />
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
                  {isLoading ? 'Enviando...' : 'Enviar Convite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;
