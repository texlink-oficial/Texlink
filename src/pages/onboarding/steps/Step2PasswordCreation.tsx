import React, { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, XCircle } from 'lucide-react';

interface Step2PasswordCreationProps {
  token: string;
  email: string;
  onComplete: () => void;
}

interface PasswordValidation {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

/**
 * Step 2: Criação de Senha
 *
 * Permite que o fornecedor crie uma senha segura
 * para acessar o sistema.
 */
export function Step2PasswordCreation({
  token,
  email,
  onComplete,
}: Step2PasswordCreationProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Validação de senha em tempo real
  const validation: PasswordValidation = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(validation).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos de segurança');
      return;
    }

    if (!passwordsMatch) {
      setError('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);

    try {
      // Integrate with backend API
      const { onboardingService } = await import('../../../services/onboarding.service');
      await onboardingService.createPassword(token, password);

      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao criar senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Criar Senha
        </h2>
        <p className="text-gray-600">
          Crie uma senha segura para acessar sua conta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campo de Senha */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Digite sua senha"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Campo de Confirmação */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Confirmar Senha
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Digite sua senha novamente"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Requisitos de Senha */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 text-sm">
            Requisitos de segurança:
          </h4>
          <div className="space-y-2">
            <ValidationItem
              valid={validation.minLength}
              text="Mínimo de 8 caracteres"
            />
            <ValidationItem
              valid={validation.hasUpperCase}
              text="Pelo menos uma letra maiúscula"
            />
            <ValidationItem
              valid={validation.hasLowerCase}
              text="Pelo menos uma letra minúscula"
            />
            <ValidationItem
              valid={validation.hasNumber}
              text="Pelo menos um número"
            />
            <ValidationItem
              valid={validation.hasSpecialChar}
              text="Pelo menos um caractere especial (!@#$%^&*)"
            />
          </div>
        </div>

        {/* Confirmação de Senhas */}
        {confirmPassword && (
          <div
            className={`flex items-center gap-2 text-sm ${
              passwordsMatch ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {passwordsMatch ? (
              <>
                <CheckCircle className="w-4 h-4" />
                As senhas coincidem
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                As senhas não coincidem
              </>
            )}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={!isPasswordValid || !passwordsMatch || isSubmitting}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Criando senha...' : 'Criar Senha e Continuar'}
        </button>
      </form>

      {/* Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Você usará esta senha para acessar o sistema após concluir o
          credenciamento.
        </p>
      </div>
    </div>
  );
}

// Componente auxiliar para itens de validação
function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {valid ? (
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}
      <span
        className={`text-sm ${
          valid ? 'text-green-700' : 'text-gray-600'
        }`}
      >
        {text}
      </span>
    </div>
  );
}
