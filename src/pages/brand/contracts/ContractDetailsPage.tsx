import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Send,
  FileSignature,
  Ban,
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
  SendForSignatureModal,
  SignContractModal,
  RespondRevisionModal,
  CancelContractModal,
} from '../../../components/contracts';
import {
  contractsService,
  type SupplierContract,
  type ContractRevision,
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
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<ContractRevision | null>(null);
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

  const handleSendForSignature = async (data: { message?: string }) => {
    if (!contract) return;
    setIsSubmitting(true);
    try {
      await contractsService.sendForSignature(contract.id, data);
      addToast({ type: 'success', message: 'Contrato enviado para assinatura' });
      setShowSendModal(false);
      fetchContract();
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao enviar contrato' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignContract = async (data: { signerName: string; accepted: boolean }) => {
    if (!contract) return;
    setIsSubmitting(true);
    try {
      await contractsService.signAsBrand(contract.id, data);
      addToast({ type: 'success', message: 'Contrato assinado com sucesso' });
      setShowSignModal(false);
      fetchContract();
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao assinar contrato' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondRevision = async (data: {
    status: 'ACCEPTED' | 'REJECTED';
    responseNotes?: string;
  }) => {
    if (!selectedRevision) return;
    setIsSubmitting(true);
    try {
      await contractsService.respondToRevision(selectedRevision.id, data);
      addToast({
        type: 'success',
        message: data.status === 'ACCEPTED' ? 'Revisão aceita' : 'Revisão rejeitada',
      });
      setShowRevisionModal(false);
      setSelectedRevision(null);
      fetchContract();
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao responder revisão' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelContract = async (data: { reason: string }) => {
    if (!contract) return;
    setIsSubmitting(true);
    try {
      await contractsService.cancel(contract.id, data);
      addToast({ type: 'success', message: 'Contrato cancelado' });
      setShowCancelModal(false);
      fetchContract();
    } catch (err) {
      addToast({ type: 'error', message: 'Erro ao cancelar contrato' });
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

  const canSendForSignature = contract?.status === 'DRAFT';
  const canSignAsBrand =
    contract?.status === 'DRAFT' || contract?.status === 'PENDING_BRAND_SIGNATURE';
  const needsBrandSignature = !contract?.brandSignedAt && canSignAsBrand;
  const canCancel = contract?.status !== 'CANCELLED' && contract?.status !== 'EXPIRED';
  const pendingRevisions = contract?.revisions?.filter((r) => r.status === 'PENDING') || [];

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
            {error || 'Contrato não encontrado'}
          </h3>
          <Button variant="outline" onClick={() => navigate('/brand/contratos')}>
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
          onClick={() => navigate('/brand/contratos')}
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
            {needsBrandSignature && (
              <Button variant="primary" onClick={() => setShowSignModal(true)} className="gap-2">
                <FileSignature className="w-4 h-4" />
                Assinar
              </Button>
            )}
            {canSendForSignature && contract.brandSignedAt && (
              <Button variant="primary" onClick={() => setShowSendModal(true)} className="gap-2">
                <Send className="w-4 h-4" />
                Enviar para Facção
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" onClick={() => setShowCancelModal(true)} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Ban className="w-4 h-4" />
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Revisions Alert */}
          {pendingRevisions.length > 0 && (
            <Card variant="outlined" padding="md" className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                    Revisões Pendentes ({pendingRevisions.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingRevisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {rev.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {rev.requestedBy?.name} - {formatDateTime(rev.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRevision(rev);
                            setShowRevisionModal(true);
                          }}
                        >
                          Responder
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Contract Details */}
          <Card variant="default" padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Detalhes do Contrato
            </h2>

            <div className="space-y-4">
              {contract.description && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Descrição</p>
                  <p className="text-gray-900 dark:text-white">{contract.description}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vigência</p>
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
              <div className={`p-4 rounded-xl border-2 ${
                contract.brandSignedAt
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}>
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
              <div className={`p-4 rounded-xl border-2 ${
                contract.supplierSignedAt
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {contract.supplierSignedAt ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">Facção</span>
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
                Histórico de Revisões
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
                          <div className={`mt-2 p-2 rounded ${
                            rev.status === 'ACCEPTED'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            <div className="flex items-center gap-1 text-xs font-medium mb-1">
                              {rev.status === 'ACCEPTED' ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              )}
                              <span className={
                                rev.status === 'ACCEPTED'
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }>
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
          {/* Counterparty */}
          <Card variant="default" padding="md">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Facção Parceira
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold">
                {(contract.supplier?.tradeName || 'F').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {contract.supplier?.tradeName || contract.supplier?.legalName || 'Facção'}
                </p>
                {contract.supplier?.document && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {contract.supplier.document}
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
                    <p className="text-sm text-gray-900 dark:text-white">Assinado pela facção</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(contract.supplierSignedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Amendments */}
          {contract.amendments && contract.amendments.length > 0 && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Aditivos</h3>
              <div className="space-y-2">
                {contract.amendments.map((amendment) => (
                  <button
                    key={amendment.id}
                    onClick={() => navigate(`/brand/contratos/${amendment.id}`)}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {amendment.title || amendment.displayId}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(amendment.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <SendForSignatureModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSubmit={handleSendForSignature}
        contract={contract}
        isLoading={isSubmitting}
      />

      <SignContractModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        onSubmit={handleSignContract}
        contract={contract}
        signerType="brand"
        isLoading={isSubmitting}
      />

      {selectedRevision && (
        <RespondRevisionModal
          isOpen={showRevisionModal}
          onClose={() => {
            setShowRevisionModal(false);
            setSelectedRevision(null);
          }}
          onSubmit={handleRespondRevision}
          revision={selectedRevision}
          isLoading={isSubmitting}
        />
      )}

      <CancelContractModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleCancelContract}
        contract={contract}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default ContractDetailsPage;
