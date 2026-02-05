import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileSignature,
  Building2,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import {
  ContractStatusBadge,
  ContractTypeBadge,
  SignContractModal,
  RequestRevisionModal,
} from '../../../components/contracts';
import {
  contractsService,
  type SupplierContract,
} from '../../../services/contracts.service';
import { useToast } from '../../../contexts/ToastContext';

export const ContractDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [contract, setContract] = useState<SupplierContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchContract = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await contractsService.getById(id);
      setContract(data);
    } catch (err) {
      setError('Erro ao carregar contrato');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const formatCurrency = (value?: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSignContract = async (data: { signerName: string; accepted: boolean }) => {
    if (!contract) return;
    setIsSubmitting(true);
    try {
      await contractsService.signAsSupplier(contract.id, data);
      addToast({ type: 'success', message: 'Contrato assinado com sucesso' });
      setShowSignModal(false);
      fetchContract();
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao assinar contrato' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async (data: { message: string }) => {
    if (!contract) return;
    setIsSubmitting(true);
    try {
      await contractsService.requestRevision(contract.id, data);
      addToast({ type: 'success', message: 'Solicitacao de revisao enviada' });
      setShowRevisionModal(false);
      fetchContract();
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao solicitar revisao' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!contract) return;
    try {
      await contractsService.download(contract.id);
      addToast({ type: 'success', message: 'Download iniciado' });
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao baixar contrato' });
    }
  };

  const canSign = contract?.status === 'PENDING_SUPPLIER_SIGNATURE' && !contract.supplierSignedAt;
  const canRequestRevision =
    contract?.status === 'PENDING_SUPPLIER_SIGNATURE' && !contract.supplierSignedAt;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {error || 'Contrato nao encontrado'}
          </h3>
          <Button variant="outline" onClick={() => navigate('/portal/contratos')}>
            Voltar para Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/portal/contratos')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contratos
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-1">
              {contract.displayId}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {contract.title || 'Contrato'}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <ContractTypeBadge type={contract.type} />
              <ContractStatusBadge status={contract.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {contract.documentUrl && (
              <Button variant="outline" onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            )}
            {canRequestRevision && (
              <Button
                variant="outline"
                onClick={() => setShowRevisionModal(true)}
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Solicitar Revisao
              </Button>
            )}
            {canSign && (
              <Button variant="primary" onClick={() => setShowSignModal(true)} className="gap-2">
                <FileSignature className="w-4 h-4" />
                Assinar Contrato
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pending signature alert */}
      {canSign && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Assinatura Pendente
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Este contrato foi enviado pela marca e aguarda sua assinatura. Revise os termos
                cuidadosamente antes de assinar.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Details */}
          <Card variant="default" padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Detalhes do Contrato
            </h2>

            <div className="space-y-4">
              {contract.description && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Descricao</p>
                  <p className="text-gray-900 dark:text-white">{contract.description}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vigencia</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(contract.validFrom)} - {formatDate(contract.validUntil)}
                    </p>
                  </div>
                </div>

                {contract.value != null && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Valor</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(contract.value)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Signatures */}
          <Card variant="default" padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assinaturas</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Brand Signature */}
              <div
                className={`p-4 rounded-xl border-2 ${
                  contract.brandSignedAt
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {contract.brandSignedAt ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">Marca</span>
                </div>
                {contract.brandSignedAt ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      <span>{contract.brandSignerName}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {formatDateTime(contract.brandSignedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aguardando assinatura</p>
                )}
              </div>

              {/* Supplier Signature */}
              <div
                className={`p-4 rounded-xl border-2 ${
                  contract.supplierSignedAt
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {contract.supplierSignedAt ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">Sua Assinatura</span>
                </div>
                {contract.supplierSignedAt ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      <span>{contract.supplierSignerName}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {formatDateTime(contract.supplierSignedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aguardando assinatura</p>
                )}
              </div>
            </div>
          </Card>

          {/* Revision History */}
          {contract.revisions && contract.revisions.length > 0 && (
            <Card variant="default" padding="lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Historico de Revisoes
              </h2>

              <div className="space-y-3">
                {contract.revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">{rev.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{rev.requestedBy?.name}</span>
                          <span>-</span>
                          <span>{formatDateTime(rev.createdAt)}</span>
                        </div>
                        {rev.status !== 'PENDING' && (
                          <div
                            className={`mt-2 p-2 rounded ${
                              rev.status === 'ACCEPTED'
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-xs font-medium mb-1">
                              {rev.status === 'ACCEPTED' ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              )}
                              <span
                                className={
                                  rev.status === 'ACCEPTED'
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-red-700 dark:text-red-300'
                                }
                              >
                                {rev.status === 'ACCEPTED' ? 'Aceita' : 'Rejeitada'}
                              </span>
                            </div>
                            {rev.responseNotes && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {rev.responseNotes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Brand Info */}
          <Card variant="default" padding="md">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Marca Contratante
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold">
                {(contract.brand?.tradeName || 'M').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contract.brand?.tradeName || contract.brand?.legalName || 'Marca'}
                </p>
                {contract.brand?.document && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {contract.brand.document}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card variant="default" padding="md">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Timeline</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-500" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">Contrato criado</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(contract.createdAt)}
                  </p>
                </div>
              </div>
              {contract.brandSignedAt && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Assinado pela marca</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(contract.brandSignedAt)}
                    </p>
                  </div>
                </div>
              )}
              {contract.supplierSignedAt && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">Assinado por voce</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(contract.supplierSignedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <SignContractModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        onSubmit={handleSignContract}
        contract={contract}
        signerType="supplier"
        isLoading={isSubmitting}
      />

      <RequestRevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSubmit={handleRequestRevision}
        contract={contract}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default ContractDetailsPage;
