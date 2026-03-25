import React from 'react';
import { Building2, Calendar, MoreVertical, FileText } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDocument, detectDocumentType, getDocumentLabel } from '../../utils/document';

export type CredentialStatus =
  | 'DRAFT'
  | 'PENDING_VALIDATION'
  | 'VALIDATING'
  | 'VALIDATION_FAILED'
  | 'PENDING_COMPLIANCE'
  | 'COMPLIANCE_APPROVED'
  | 'COMPLIANCE_REJECTED'
  | 'INVITATION_PENDING'
  | 'INVITATION_SENT'
  | 'INVITATION_OPENED'
  | 'INVITATION_EXPIRED'
  | 'ONBOARDING_STARTED'
  | 'ONBOARDING_IN_PROGRESS'
  | 'CONTRACT_PENDING'
  | 'CONTRACT_SIGNED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BLOCKED';

interface Credential {
  id: string;
  cnpj: string;
  documentType?: 'CNPJ' | 'CPF';
  tradeName?: string;
  legalName?: string;
  status: CredentialStatus;
  createdAt: string | Date;
  internalCode?: string;
  category?: string;
}

interface CredentialAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface CredentialCardProps {
  credential: Credential;
  onClick?: () => void;
  actions?: CredentialAction[];
  className?: string;
}

const statusConfig: Record<CredentialStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' }> = {
  DRAFT: { label: 'Rascunho', variant: 'default' },
  PENDING_VALIDATION: { label: 'Aguardando Validação', variant: 'warning' },
  VALIDATING: { label: 'Validando', variant: 'info' },
  VALIDATION_FAILED: { label: 'Validação Falhou', variant: 'error' },
  PENDING_COMPLIANCE: { label: 'Aguardando Compliance', variant: 'warning' },
  COMPLIANCE_APPROVED: { label: 'Compliance Aprovado', variant: 'success' },
  COMPLIANCE_REJECTED: { label: 'Compliance Rejeitado', variant: 'error' },
  INVITATION_PENDING: { label: 'Convite Pendente', variant: 'warning' },
  INVITATION_SENT: { label: 'Convite Enviado', variant: 'info' },
  INVITATION_OPENED: { label: 'Convite Aberto', variant: 'purple' },
  INVITATION_EXPIRED: { label: 'Convite Expirado', variant: 'error' },
  ONBOARDING_STARTED: { label: 'Onboarding Iniciado', variant: 'info' },
  ONBOARDING_IN_PROGRESS: { label: 'Onboarding em Progresso', variant: 'purple' },
  CONTRACT_PENDING: { label: 'Contrato Pendente', variant: 'warning' },
  CONTRACT_SIGNED: { label: 'Contrato Assinado', variant: 'success' },
  ACTIVE: { label: 'Ativo', variant: 'success' },
  SUSPENDED: { label: 'Suspenso', variant: 'warning' },
  BLOCKED: { label: 'Bloqueado', variant: 'error' },
};

const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onClick,
  actions = [],
  className = '',
}) => {
  const [showActions, setShowActions] = React.useState(false);
  const statusInfo = statusConfig[credential.status];

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5
        ${onClick ? 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {credential.tradeName || credential.legalName || 'Nome não informado'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDocument(credential.cnpj, credential.documentType || detectDocumentType(credential.cnpj))}</p>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                        setShowActions(false);
                      }}
                      className={`
                        w-full px-4 py-2 text-sm text-left flex items-center gap-2
                        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                        ${action.variant === 'danger'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <StatusBadge label={statusInfo.label} variant={statusInfo.variant} dot />

          {credential.internalCode && (
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <FileText className="h-4 w-4" />
              <span>{credential.internalCode}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(credential.createdAt)}</span>
        </div>
      </div>

      {credential.category && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
            {credential.category}
          </span>
        </div>
      )}
    </div>
  );
};

export default CredentialCard;
