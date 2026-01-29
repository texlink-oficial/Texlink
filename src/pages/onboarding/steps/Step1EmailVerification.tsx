import React, { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';

interface Step1EmailVerificationProps {
  token: string;
  email: string;
  onComplete: () => void;
}

/**
 * Step 1: Verificação de Email
 *
 * Confirma que o usuário recebeu e abriu o convite
 * por email. Geralmente já está "completado" ao acessar
 * o link do convite.
 */
export function Step1EmailVerification({
  token,
  email,
  onComplete,
}: Step1EmailVerificationProps) {
  const [isVerified] = useState(true); // Já verificado ao acessar o link

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          {isVerified ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <Mail className="w-8 h-8 text-blue-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Email Verificado
        </h2>
        <p className="text-gray-600">
          Seu email foi verificado com sucesso ao acessar este link
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-1">
              Verificação Completa
            </h3>
            <p className="text-sm text-green-700 mb-2">
              O email <strong>{email}</strong> foi confirmado.
            </p>
            <p className="text-sm text-green-600">
              Você pode prosseguir para a próxima etapa: criação de senha.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 text-sm">
          📋 Próximas etapas
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Criar senha para sua conta</li>
          <li>• Preencher dados da empresa</li>
          <li>• Enviar documentos necessários</li>
          <li>• Configurar capacidades produtivas</li>
          <li>• Assinar contrato de fornecimento</li>
        </ul>
      </div>
    </div>
  );
}
