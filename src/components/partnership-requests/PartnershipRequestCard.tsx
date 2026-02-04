import React from 'react';
import { MapPin, Calendar, Clock, MessageSquare, User } from 'lucide-react';
import { PartnershipRequestBadge } from './PartnershipRequestBadge';
import { Button } from '../ui/Button';
import type { PartnershipRequest } from '../../services/partnershipRequests.service';

interface PartnershipRequestCardProps {
  request: PartnershipRequest;
  viewType: 'brand' | 'supplier';
  onRespond?: (request: PartnershipRequest) => void;
  onCancel?: (request: PartnershipRequest) => void;
  onViewDetails?: (request: PartnershipRequest) => void;
}

export const PartnershipRequestCard: React.FC<PartnershipRequestCardProps> = ({
  request,
  viewType,
  onRespond,
  onCancel,
  onViewDetails,
}) => {
  const company = viewType === 'brand' ? request.supplier : request.brand;
  const companyName = company?.tradeName || company?.legalName || 'Empresa';
  const isPending = request.status === 'PENDING';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiration = () => {
    const now = new Date();
    const expires = new Date(request.expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Company Avatar */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-lg">
            {companyName.charAt(0).toUpperCase()}
          </div>

          {/* Company Info */}
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {companyName}
            </h3>
            {company && (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{company.city}, {company.state}</span>
              </div>
            )}
          </div>
        </div>

        <PartnershipRequestBadge status={request.status} showDot={isPending} />
      </div>

      {/* Message */}
      {request.message && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {request.message}
            </p>
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {request.status === 'REJECTED' && request.rejectionReason && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>Motivo da recusa:</strong> {request.rejectionReason}
          </p>
        </div>
      )}

      {/* Meta Info */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Enviada em {formatDate(request.createdAt)}</span>
        </div>

        {isPending && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Expira em {getDaysUntilExpiration()} dias</span>
          </div>
        )}

        {request.respondedAt && (
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>
              Respondida em {formatDate(request.respondedAt)}
              {request.respondedBy && ` por ${request.respondedBy.name}`}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        {viewType === 'supplier' && isPending && onRespond && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRespond(request)}
          >
            Responder
          </Button>
        )}

        {viewType === 'brand' && isPending && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(request)}
          >
            Cancelar
          </Button>
        )}

        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(request)}
          >
            Ver Detalhes
          </Button>
        )}
      </div>
    </div>
  );
};

export default PartnershipRequestCard;
