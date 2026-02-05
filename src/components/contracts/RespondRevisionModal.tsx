import React, { useState } from 'react';
import { X, Check, XCircle, MessageSquare, User } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ContractRevision } from '../../services/contracts.service';

interface RespondRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { status: 'ACCEPTED' | 'REJECTED'; responseNotes?: string }) => Promise<void>;
  revision: ContractRevision;
  isLoading?: boolean;
}

export const RespondRevisionModal: React.FC<RespondRevisionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  revision,
  isLoading = false,
}) => {
  const [response, setResponse] = useState<'ACCEPTED' | 'REJECTED' | null>(null);
  const [responseNotes, setResponseNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response) return;
    await onSubmit({ status: response, responseNotes: responseNotes.trim() || undefined });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Responder Solicitacao de Revisao
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
              {/* Revision Request Info */}
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                      Solicitacao de revisao:
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300">{revision.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 mt-2 pt-2 border-t border-orange-200 dark:border-orange-700">
                  <User className="w-3.5 h-3.5" />
                  <span>
                    {revision.requestedBy?.name} - {formatDate(revision.createdAt)}
                  </span>
                </div>
              </div>

              {/* Response Options */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sua resposta:</p>

                {/* Accept Option */}
                <button
                  type="button"
                  onClick={() => setResponse('ACCEPTED')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    response === 'ACCEPTED'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      response === 'ACCEPTED'
                        ? 'bg-green-500 text-white'
                        : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Aceitar Revisao</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      O contrato sera atualizado conforme solicitado
                    </p>
                  </div>
                </button>

                {/* Reject Option */}
                <button
                  type="button"
                  onClick={() => setResponse('REJECTED')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    response === 'REJECTED'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      response === 'REJECTED'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Rejeitar Revisao</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      O contrato sera mantido como esta
                    </p>
                  </div>
                </button>
              </div>

              {/* Response Notes */}
              <div>
                <label
                  htmlFor="responseNotes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Observacoes {response === 'REJECTED' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  id="responseNotes"
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder={
                    response === 'ACCEPTED'
                      ? 'Adicione observacoes sobre a revisao (opcional)...'
                      : 'Explique o motivo da rejeicao...'
                  }
                  rows={3}
                  maxLength={500}
                  required={response === 'REJECTED'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {responseNotes.length}/500
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
                variant={response === 'ACCEPTED' ? 'primary' : 'danger'}
                loading={isLoading}
                disabled={!response || (response === 'REJECTED' && !responseNotes.trim())}
              >
                {response === 'ACCEPTED' ? 'Confirmar Aceite' : 'Confirmar Rejeicao'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RespondRevisionModal;
