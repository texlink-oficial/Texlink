import React, { useState } from 'react';
import { X, MessageSquare, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import type { SupplierContract } from '../../services/contracts.service';

interface RequestRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message: string }) => Promise<void>;
  contract: SupplierContract;
  isLoading?: boolean;
}

export const RequestRevisionModal: React.FC<RequestRevisionModalProps> = ({
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
    if (!message.trim()) return;
    await onSubmit({ message: message.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Solicitar Revisão
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
              {/* Contract Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {contract.displayId}
                  </p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contract.title || 'Contrato'}
                </p>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Descreva as alterações ou esclarecimentos que você gostaria de solicitar. A marca
                  será notificada e poderá responder sua solicitação.
                </p>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Mensagem <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva as alterações ou esclarecimentos solicitados..."
                  rows={4}
                  maxLength={1000}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {message.length}/1000
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                disabled={!message.trim()}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar Solicitação
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestRevisionModal;
