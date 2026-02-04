import React from 'react';
import { StatusBadge, type BadgeVariant } from '../shared/StatusBadge';
import type { PartnershipRequestStatus } from '../../services/partnershipRequests.service';

interface PartnershipRequestBadgeProps {
  status: PartnershipRequestStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<PartnershipRequestStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  ACCEPTED: { label: 'Aceita', variant: 'success' },
  REJECTED: { label: 'Recusada', variant: 'error' },
  CANCELLED: { label: 'Cancelada', variant: 'default' },
  EXPIRED: { label: 'Expirada', variant: 'default' },
};

export const PartnershipRequestBadge: React.FC<PartnershipRequestBadgeProps> = ({
  status,
  size = 'sm',
  showDot = false,
  className,
}) => {
  const config = statusConfig[status];

  return (
    <StatusBadge
      label={config.label}
      variant={config.variant}
      size={size}
      dot={showDot}
      className={className}
    />
  );
};

export default PartnershipRequestBadge;
