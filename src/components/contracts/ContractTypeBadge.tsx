import React from 'react';
import { FileText, Shield, Scale, FilePlus } from 'lucide-react';
import type { ContractType } from '../../services/contracts.service';

interface ContractTypeBadgeProps {
  type: ContractType;
  size?: 'sm' | 'md';
}

const typeConfig: Record<ContractType, { label: string; icon: React.ElementType; className: string }> = {
  SERVICE_AGREEMENT: {
    label: 'Prestacao de Servicos',
    icon: FileText,
    className: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  },
  NDA: {
    label: 'Confidencialidade',
    icon: Shield,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  CODE_OF_CONDUCT: {
    label: 'Codigo de Conduta',
    icon: Scale,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  AMENDMENT: {
    label: 'Aditivo',
    icon: FilePlus,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

export const ContractTypeBadge: React.FC<ContractTypeBadgeProps> = ({ type, size = 'md' }) => {
  const config = typeConfig[type];
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

export default ContractTypeBadge;
