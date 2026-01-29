import React, { useState, useEffect } from 'react';
import { FileSignature, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { contractsService, type SupplierContract } from '../../../services/contracts.service';
import { PDFViewer } from '../../../components/shared/PDFViewer';
import { useToast } from '../../../contexts/ToastContext';

interface Step6ContractReviewProps {
  token: string;
  onComplete: () => void;
}

/**
 * Step 6: Revisão e Assinatura do Contrato
 *
 * Última etapa do onboarding onde o fornecedor:
 * 1. Visualiza o contrato gerado
 * 2. Aceita os termos
 * 3. Assina eletronicamente
 * 4. É redirecionado para o portal
 */
export function Step6ContractReview({ token, onComplete }: Step6ContractReviewProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [contract, setContract] = useState<SupplierContract | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Carregar ou gerar contrato
  useEffect(() => {
    loadContract();
  }, [token]);

  const loadContract = async () => {
    try {
      setIsLoadingContract(true);
      setError('');

      // Tentar buscar contrato existente
      let contractData: SupplierContract | null = null;

      try {
        contractData = await contractsService.getContract(token);
      } catch (err: any) {
        // Se não existe, gerar novo
        if (err.response?.status === 404) {
          setIsGenerating(true);
          contractData = await contractsService.generateContract(token);
        } else {
          throw err;
        }
      }

      setContract(contractData);
    } catch (err: any) {
      console.error('Erro ao carregar contrato:', err);
      setError(err.message || 'Erro ao carregar contrato');
    } finally {
      setIsLoadingContract(false);
      setIsGenerating(false);
    }
  };

  const handleSign = async () => {
    if (!accepted) {
      setError('Você precisa aceitar os termos do contrato');
      toast.warning('Aceite necessário', 'Você precisa aceitar os termos do contrato para continuar.');
      return;
    }

    setError('');
    setIsSigning(true);

    try {
      await contractsService.signContract(token, true);

      setSuccess(true);

      toast.success(
        'Contrato assinado! 🎉',
        'Seu credenciamento foi concluído com sucesso. Bem-vindo à plataforma!'
      );

      // Aguardar 2 segundos e redirecionar
      setTimeout(() => {
        navigate('/portal/inicio');
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao assinar contrato';
      setError(errorMsg);
      toast.error('Erro na assinatura', errorMsg);
    } finally {
      setIsSigning(false);
    }
  };

  // Loading state
  if (isLoadingContract || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 text-lg">
          {isGenerating ? 'Gerando contrato...' : 'Carregando contrato...'}
        </p>
        <p className="text-gray-500 text-sm mt-2">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Contrato Assinado com Sucesso! 🎉
        </h2>
        <p className="text-gray-600 text-lg mb-6">
          Seu credenciamento está completo. Redirecionando para o portal...
        </p>
        <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && !contract) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-red-800 font-semibold mb-2">Erro ao carregar contrato</h3>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={loadContract}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <FileSignature className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Revisão e Assinatura do Contrato
        </h2>
        <p className="text-gray-600">
          Leia atentamente o contrato e assine para finalizar seu credenciamento
        </p>
      </div>

      {/* PDF Viewer */}
      {contract && (
        <div className="mb-6">
          <PDFViewer
            url={contract.documentUrl}
            title="Contrato de Prestação de Serviços"
          />
        </div>
      )}

      {/* Checkbox de Aceite */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <span className="text-gray-900 font-medium group-hover:text-blue-600 transition-colors">
              Li e aceito todos os termos e condições do contrato
            </span>
            <p className="text-sm text-gray-500 mt-1">
              Ao assinar este contrato, você concorda em prestar serviços de
              produção têxtil conforme as condições estabelecidas.
            </p>
          </div>
        </label>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Botão de Assinatura */}
      <button
        onClick={handleSign}
        disabled={!accepted || isSigning}
        className="w-full py-4 px-6 bg-green-600 text-white font-semibold text-lg rounded-lg shadow-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isSigning ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Assinando contrato...
          </>
        ) : (
          <>
            <FileSignature className="w-6 h-6" />
            Assinar Contrato e Finalizar
          </>
        )}
      </button>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 text-sm">
          🔒 Assinatura Eletrônica Segura
        </h4>
        <p className="text-sm text-blue-700">
          Sua assinatura será registrada eletronicamente com timestamp e endereço
          IP para fins de validade jurídica. O contrato assinado ficará
          disponível no seu portal.
        </p>
      </div>

      {/* Informações do Contrato */}
      {contract && (
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>
            Contrato ID: {contract.id} • Template: {contract.templateId || 'Padrão'}{' '}
            v{contract.templateVersion || '1.0'}
          </p>
          <p className="mt-1">
            Gerado em: {new Date(contract.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}
