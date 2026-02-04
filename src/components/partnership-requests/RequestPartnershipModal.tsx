import React, { useState } from 'react';
import { X, Send, Building2, MapPin, Star } from 'lucide-react';
import { Button } from '../ui/Button';

interface SupplierInfo {
  id: string;
  tradeName?: string;
  legalName: string;
  city: string;
  state: string;
  avgRating?: number;
  logoUrl?: string;
}

interface RequestPartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { supplierId: string; message?: string }) => Promise<void>;
  supplier: SupplierInfo;
  isLoading?: boolean;
}

export const RequestPartnershipModal: React.FC<RequestPartnershipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  isLoading = false,
}) => {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      supplierId: supplier.id,
      message: message.trim() || undefined,
    });
  };

  const supplierName = supplier.tradeName || supplier.legalName;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Solicitar Parceria
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              {/* Supplier Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-lg">
                  {supplierName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {supplierName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {supplier.city}, {supplier.state}
                    </span>
                    {supplier.avgRating !== undefined && supplier.avgRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                        {supplier.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ao enviar esta solicitação, o fornecedor receberá uma notificação
                e poderá aceitar ou recusar a parceria. A solicitação expira em 30 dias.
              </p>

              {/* Message Input */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Mensagem (opcional)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Apresente sua empresa ou explique o motivo da solicitação..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {message.length}/1000
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestPartnershipModal;
