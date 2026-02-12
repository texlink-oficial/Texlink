import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Building2, DollarSign, AlertCircle, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ContractTypeBadge } from './ContractTypeBadge';
import type { SupplierContract } from '../../services/contracts.service';

interface ContractCardProps {
  contract: SupplierContract;
  viewType?: 'brand' | 'supplier';
}

export const ContractCard: React.FC<ContractCardProps> = ({ contract, viewType = 'brand' }) => {
  const navigate = useNavigate();

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value?: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const isExpiringSoon = () => {
    if (!contract.validUntil || contract.status !== 'SIGNED') return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(contract.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const hasPendingRevisions = contract.revisions?.some((r) => r.status === 'PENDING');

  const handleClick = () => {
    const basePath = viewType === 'brand' ? '/brand/contratos' : '/portal/contratos';
    navigate(`${basePath}/${contract.id}`);
  };

  const counterpartyName = viewType === 'brand'
    ? contract.supplier?.tradeName || contract.supplier?.legalName
    : contract.brand?.tradeName || contract.brand?.legalName;

  return (
    <Card
      variant="default"
      padding="md"
      clickable
      onClick={handleClick}
      className="group hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">
            {contract.displayId}
          </p>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {contract.title || 'Contrato sem título'}
          </h3>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors ml-2 flex-shrink-0" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <ContractTypeBadge type={contract.type} size="sm" />
        <ContractStatusBadge status={contract.status} size="sm" />
      </div>

      {counterpartyName && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="truncate">{counterpartyName}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>
          {formatDate(contract.validFrom)} - {formatDate(contract.validUntil)}
        </span>
      </div>

      {contract.value != null && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span>{formatCurrency(contract.value)}</span>
        </div>
      )}

      {/* Alerts */}
      {(isExpiringSoon() || hasPendingRevisions) && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
          {isExpiringSoon() && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Vencendo em breve</span>
            </div>
          )}
          {hasPendingRevisions && (
            <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Revisão pendente</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ContractCard;
