import React, { useState } from 'react';
import { X, Shield, FileText, Eye, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface LGPDConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (consent: boolean) => void;
  brandName: string;
  isLoading?: boolean;
}

const DOCUMENT_TYPES = [
  'CNPJ e situação cadastral',
  'Certidões negativas de débitos',
  'Guias de recolhimento (INSS, FGTS, DAS)',
  'Licenças de funcionamento',
  'Laudos técnicos (NRs)',
  'Certificações ABVTEX',
];

export const LGPDConsentModal: React.FC<LGPDConsentModalProps> = ({
  isOpen,
  onClose,
  onConsent,
  brandName,
  isLoading = false,
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  if (!isOpen) return null;

  const handleAcceptWithSharing = () => {
    if (!acceptedTerms) return;
    onConsent(true);
  };

  const handleAcceptWithoutSharing = () => {
    onConsent(false);
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
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-brand-50 dark:bg-brand-900/20 rounded-t-xl">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-800 flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compartilhamento de Documentos
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lei Geral de Protecao de Dados (LGPD)
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Intro */}
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>
                Ao aceitar esta parceria, a marca <strong className="text-gray-900 dark:text-white">{brandName}</strong> poderá
                visualizar seus documentos de compliance para verificar sua regularidade.
              </p>
            </div>

            {/* Documents List */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Documentos que poderão ser visualizados:
                </span>
              </div>
              <ul className="space-y-2">
                {DOCUMENT_TYPES.map((doc, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>

            {/* LGPD Rights */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Seus direitos LGPD:
                </span>
              </div>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  Você pode revogar este consentimento a qualquer momento
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  Ao revogar, o relacionamento com a marca será encerrado
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  Os documentos serão usados apenas para verificação de compliance
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <a
                    href="/politica-privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900 dark:hover:text-blue-200"
                  >
                    Consulte nossa Política de Privacidade
                  </a>
                </li>
              </ul>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Eu li e concordo com o compartilhamento dos meus documentos de compliance com a marca{' '}
                <strong>{brandName}</strong>, conforme os termos da LGPD.
              </span>
            </label>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Você também pode aceitar a parceria sem compartilhar documentos.
                Neste caso, a marca não terá acesso aos seus documentos de compliance.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={isLoading || !acceptedTerms}
              onClick={handleAcceptWithSharing}
            >
              {isLoading ? 'Processando...' : 'Aceitar e Compartilhar Documentos'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={handleAcceptWithoutSharing}
            >
              Aceitar sem Compartilhar
            </Button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancelar e voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LGPDConsentModal;
