import React, { useState } from 'react';
import { X, Mail, Copy, Check, ShieldAlert } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <Mail className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Convidar por Email</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {sentInvitation ? (
            // Success state
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 dark:border-green-800/30">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Convite Enviado!</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 px-4">
                Um convite foi criado para <strong className="text-gray-900 dark:text-white">{sentInvitation.email}</strong>
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-left">Link do convite:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${sentInvitation.inviteUrl}`}
                    className="flex-1 bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none truncate font-medium"
                  />
                  <button
                    onClick={copyLink}
                    className="p-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-all"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg p-3 text-center">
                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-normal">
                  O convite expira em 7 dias. O usuário receberá um e-mail com as instruções de acesso.
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-8 w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 active:scale-[0.98] transition-all"
              >
                Concluir
              </button>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm flex gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                    className="w-full h-10 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>

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
                    <div className="p-3 bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100/50 dark:border-brand-900/20 rounded-xl">
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                        <strong className="text-brand-700 dark:text-brand-400 block mb-1">Permissões da Função:</strong>
                        {ROLE_DESCRIPTIONS[companyRole]}
                      </p>
                    </div>
                  </div>
                </div>
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
                      Enviando...
                    </div>
                  ) : 'Enviar Convite'}
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
