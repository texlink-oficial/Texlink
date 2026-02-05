import React from 'react';
import { Clock, FileCheck, FileEdit, FileX, AlertTriangle } from 'lucide-react';
import type { ContractStatus } from '../../services/contracts.service';

interface ContractStatusBadgeProps {
  status: ContractStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ContractStatus, { label: string; icon: React.ElementType; className: string }> = {
  DRAFT: {
    label: 'Rascunho',
    icon: FileEdit,
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
  PENDING_BRAND_SIGNATURE: {
    label: 'Aguardando Marca',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  PENDING_SUPPLIER_SIGNATURE: {
    label: 'Aguardando Faccao',
    icon: Clock,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  SIGNED: {
    label: 'Assinado',
    icon: FileCheck,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  EXPIRED: {
    label: 'Expirado',
    icon: AlertTriangle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  CANCELLED: {
    label: 'Cancelado',
    icon: FileX,
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  },
};

export const ContractStatusBadge: React.FC<ContractStatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${config.className}`}>
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
};

export default ContractStatusBadge;
