import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { SupplierContract } from '../../services/contracts.service';

interface SendForSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message?: string }) => Promise<void>;
  contract: SupplierContract;
  isLoading?: boolean;
}

export const SendForSignatureModal: React.FC<SendForSignatureModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  isLoading = false,
}) => {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ message: message.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enviar para Assinatura
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              {/* Contract Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Contrato</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contract.title || contract.displayId}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {contract.supplier?.tradeName || contract.supplier?.legalName}
                </p>
              </div>

              {/* Info Alert */}
              <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Acao necessaria</p>
                  <p>
                    Voce precisara assinar o contrato primeiro. Apos sua assinatura, o contrato sera
                    enviado para a faccao parceira.
                  </p>
                </div>
              </div>

              {/* Message */}
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
                  placeholder="Adicione uma mensagem para a faccao..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {message.length}/500
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={isLoading} className="gap-2">
                <Send className="w-4 h-4" />
                Enviar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendForSignatureModal;
