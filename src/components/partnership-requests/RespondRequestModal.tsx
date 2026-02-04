import React, { useState } from 'react';
import { X, Check, XCircle, Building2, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { LGPDConsentModal } from './LGPDConsentModal';
import type { PartnershipRequest } from '../../services/partnershipRequests.service';

interface RespondRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { accepted: boolean; rejectionReason?: string; documentSharingConsent?: boolean }) => Promise<void>;
  request: PartnershipRequest;
  isLoading?: boolean;
}

export const RespondRequestModal: React.FC<RespondRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  request,
  isLoading = false,
}) => {
  const [response, setResponse] = useState<'accept' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response) return;

    if (response === 'accept') {
      // Show LGPD consent modal before accepting
      setShowConsentModal(true);
      return;
    }

    // For rejection, submit directly
    await onSubmit({
      accepted: false,
      rejectionReason: rejectionReason.trim(),
    });
  };

  const handleConsentDecision = async (documentSharingConsent: boolean) => {
    setShowConsentModal(false);
    await onSubmit({
      accepted: true,
      documentSharingConsent,
    });
  };

  const brandName = request.brand?.tradeName || request.brand?.legalName || 'Marca';

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
              Responder Solicitação
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
              {/* Brand Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-lg">
                  {brandName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {brandName}
                    </span>
                  </div>
                  {request.brand && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5" />
                      {request.brand.city}, {request.brand.state}
                    </div>
                  )}
                </div>
              </div>

              {/* Message from Brand */}
              {request.message && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                        Mensagem da marca:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {request.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Response Options */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sua resposta:
                </p>

                {/* Accept Option */}
                <button
                  type="button"
                  onClick={() => setResponse('accept')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    response === 'accept'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    response === 'accept'
                      ? 'bg-green-500 text-white'
                      : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  }`}>
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Aceitar Parceria
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Um relacionamento será criado com esta marca
                    </p>
                  </div>
                </button>

                {/* Reject Option */}
                <button
                  type="button"
                  onClick={() => setResponse('reject')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    response === 'reject'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    response === 'reject'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                  }`}>
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Recusar Solicitação
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Informe o motivo para a marca
                    </p>
                  </div>
                </button>
              </div>

              {/* Rejection Reason */}
              {response === 'reject' && (
                <div>
                  <label
                    htmlFor="rejectionReason"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Motivo da recusa <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explique brevemente o motivo da recusa..."
                    rows={3}
                    maxLength={500}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                    {rejectionReason.length}/500
                  </p>
                </div>
              )}
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
                variant={response === 'accept' ? 'primary' : 'destructive'}
                disabled={isLoading || !response || (response === 'reject' && !rejectionReason.trim())}
              >
                {isLoading
                  ? 'Enviando...'
                  : response === 'accept'
                    ? 'Confirmar Aceite'
                    : 'Confirmar Recusa'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* LGPD Consent Modal */}
      <LGPDConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsent={handleConsentDecision}
        brandName={brandName}
        isLoading={isLoading}
      />
    </div>
  );
};

export default RespondRequestModal;
