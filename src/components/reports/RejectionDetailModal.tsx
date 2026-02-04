import React from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  Package,
  Factory,
  FileText,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  RejectionDetail,
  REJECTION_CATEGORY_LABELS,
  REJECTION_CATEGORY_COLORS,
  RejectionCategory,
} from '../../services/rejectionReports.service';

interface RejectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierName: string;
  details: RejectionDetail[];
  isLoading?: boolean;
  totalCount: number;
  onLoadMore?: () => void;
}

const SkeletonItem: React.FC = () => (
  <div className="animate-pulse p-4 border-b border-gray-100 dark:border-white/[0.06]">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full mt-2" />
  </div>
);

export const RejectionDetailModal: React.FC<RejectionDetailModalProps> = ({
  isOpen,
  onClose,
  supplierName,
  details,
  isLoading = false,
  totalCount,
  onLoadMore,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl transform transition-all max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalhes de Rejeições
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <Factory className="w-4 h-4" />
                {supplierName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && details.length === 0 ? (
              <>
                <SkeletonItem />
                <SkeletonItem />
                <SkeletonItem />
              </>
            ) : details.length === 0 ? (
              <div className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum detalhe de rejeição encontrado
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {details.map((detail) => (
                  <div
                    key={detail.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/brand/pedidos/${detail.orderId}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1"
                          >
                            <Package className="w-4 h-4" />
                            {detail.orderDisplayId}
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {detail.productName}
                          </span>
                        </div>

                        {/* Reason */}
                        <div className="mt-2 flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {detail.reason}
                          </p>
                        </div>

                        {/* Description */}
                        {detail.defectDescription && (
                          <p className="mt-1 ml-6 text-xs text-gray-500 dark:text-gray-400 italic">
                            "{detail.defectDescription}"
                          </p>
                        )}

                        {/* Tags Row */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {/* Category Badge */}
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${REJECTION_CATEGORY_COLORS[detail.category]}20`,
                              color: REJECTION_CATEGORY_COLORS[detail.category],
                            }}
                          >
                            {REJECTION_CATEGORY_LABELS[detail.category]}
                          </span>

                          {/* Quantity */}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {detail.quantity} peça{detail.quantity !== 1 ? 's' : ''}
                          </span>

                          {/* Requires Rework */}
                          {detail.requiresRework && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              <Wrench className="w-3 h-3" />
                              Retrabalho
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(detail.reviewedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {details.length < totalCount && onLoadMore && (
              <div className="p-4 border-t border-gray-100 dark:border-white/[0.06]">
                <button
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="w-full py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 disabled:opacity-50"
                >
                  {isLoading ? 'Carregando...' : `Carregar mais (${totalCount - details.length} restantes)`}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex-shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {details.length} de {totalCount} itens
            </p>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionDetailModal;
