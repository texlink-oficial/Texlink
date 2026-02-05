import React, { useState } from 'react';
import { X, FileSignature, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { SupplierContract } from '../../services/contracts.service';

interface SignContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { signerName: string; accepted: boolean }) => Promise<void>;
  contract: SupplierContract;
  signerType: 'brand' | 'supplier';
  isLoading?: boolean;
}

export const SignContractModal: React.FC<SignContractModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contract,
  signerType,
  isLoading = false,
}) => {
  const [signerName, setSignerName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !acceptedTerms) return;
    await onSubmit({ signerName: signerName.trim(), accepted: true });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Assinar Contrato
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
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">
                  {contract.displayId}
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contract.title || 'Contrato'}
                </p>
              </div>

              {/* Security Notice */}
              <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">Assinatura Digital</p>
                  <p>
                    Sua assinatura sera registrada com data, hora e endereco IP para validade
                    juridica.
                  </p>
                </div>
              </div>

              {/* Signer Name */}
              <div>
                <label
                  htmlFor="signerName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Nome completo do assinante <span className="text-red-500">*</span>
                </label>
                <Input
                  id="signerName"
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Conforme documento de identificacao
                </p>
              </div>

              {/* Terms Acceptance */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Declaro que li e concordo com todos os termos e condicoes deste contrato, e que
                  estou legalmente autorizado a assinar em nome da{' '}
                  {signerType === 'brand' ? 'empresa contratante' : 'empresa contratada'}.
                </span>
              </label>

              {/* Warning */}
              <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Esta acao nao pode ser desfeita. Apos assinatura, o contrato tera validade legal.</p>
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
                disabled={!signerName.trim() || !acceptedTerms}
                className="gap-2"
              >
                <FileSignature className="w-4 h-4" />
                Assinar Contrato
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignContractModal;
