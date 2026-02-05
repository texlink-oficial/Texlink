import React, { useState } from 'react';
import { X, AlertTriangle, Ban } from 'lucide-react';
import { Button } from '../ui/Button';
import type { SupplierContract } from '../../services/contracts.service';

interface CancelContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { reason: string }) => Promise<void>;
  contract: SupplierContract;
  isLoading?: boolean;
}

export const CancelContractModal: React.FC<CancelContractModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !confirmed) return;
    await onSubmit({ reason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Cancelar Contrato
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              {/* Warning */}
              <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium mb-1">Atencao!</p>
                  <p>
                    Esta acao ira cancelar permanentemente o contrato. Ambas as partes serao
                    notificadas e o contrato nao podera ser reativado.
                  </p>
                </div>
              </div>

              {/* Contract Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">
                  {contract.displayId}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contract.title || 'Contrato'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {contract.supplier?.tradeName || contract.supplier?.legalName}
                </p>
              </div>

              {/* Reason */}
              <div>
                <label
                  htmlFor="reason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Motivo do cancelamento <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo do cancelamento..."
                  rows={3}
                  maxLength={500}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {reason.length}/500
                </p>
              </div>

              {/* Confirmation */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Confirmo que desejo cancelar este contrato e estou ciente de que esta acao nao pode
                  ser desfeita.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Voltar
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={isLoading}
                disabled={!reason.trim() || !confirmed}
                className="gap-2"
              >
                <Ban className="w-4 h-4" />
                Cancelar Contrato
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CancelContractModal;
