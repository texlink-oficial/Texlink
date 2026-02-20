import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  RefreshCw,
  ShieldOff,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  supplierDocumentsService,
  type SupplierDocumentSummaryForBrand,
} from '../../services/supplierDocuments.service';
import type { SupplierDocument, SupplierDocumentType, SupplierDocumentStatus } from '../../types';
import { SUPPLIER_DOCUMENT_TYPE_LABELS as DOCUMENT_TYPE_LABELS } from '../../types';

interface SupplierDocumentsTabProps {
  supplierId: string;
  supplierName: string;
}

const STATUS_CONFIG = {
  VALID: {
    label: 'Válido',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle,
  },
  EXPIRING_SOON: {
    label: 'Expirando',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: Clock,
  },
  EXPIRED: {
    label: 'Vencido',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: XCircle,
  },
  PENDING: {
    label: 'Pendente',
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-700',
    icon: AlertCircle,
  },
};

export const SupplierDocumentsTab: React.FC<SupplierDocumentsTabProps> = ({
  supplierId,
  supplierName,
}) => {
  const [summary, setSummary] = useState<SupplierDocumentSummaryForBrand | null>(null);
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<SupplierDocumentType | ''>('');
  const [filterStatus, setFilterStatus] = useState<SupplierDocumentStatus | ''>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const summaryData = await supplierDocumentsService.getSummaryForBrand(supplierId);
      setSummary(summaryData);

      if (summaryData.hasConsent) {
        const docsData = await supplierDocumentsService.getForBrand(
          supplierId,
          filterType || undefined,
          filterStatus || undefined
        );
        setDocuments(docsData);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [supplierId, filterType, filterStatus]);

  const handleDownload = async (documentId: string) => {
    try {
      const { url } = await supplierDocumentsService.getDownloadUrlForBrand(supplierId, documentId);
      window.open(url, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao baixar documento');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando documentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Erro ao carregar documentos
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <Button variant="outline" onClick={fetchData}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  // No consent state
  if (summary && !summary.hasConsent) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Acesso não autorizado
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {summary.message || 'O fornecedor não autorizou o compartilhamento de documentos com sua marca.'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          O consentimento pode ser concedido durante a aceitação de uma solicitação de parceria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Summary Card */}
      {summary && (
        <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-800/20 rounded-xl p-6 border border-brand-200 dark:border-brand-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compliance de Documentos
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Consentimento em: {formatDate(summary.consentedAt)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">
                {summary.compliancePercentage}%
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de conformidade</p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{summary.valid}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Validos</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
              <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{summary.expiringSoon}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Expirando</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
              <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{summary.expired}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Vencidos</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
              <AlertCircle className="w-5 h-5 text-gray-500 mx-auto mb-1" />
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{summary.pending}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Pendentes</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Filtros:</span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as SupplierDocumentStatus | '')}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Todos os status</option>
          <option value="VALID">Validos</option>
          <option value="EXPIRING_SOON">Expirando</option>
          <option value="EXPIRED">Vencidos</option>
          <option value="PENDING">Pendentes</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as SupplierDocumentType | '')}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => {
            const statusConfig = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                      <FileText className={`w-5 h-5 ${statusConfig.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                      </h4>
                      {doc.fileName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {doc.fileName}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {doc.expiresAt && (
                          <span>Validade: {formatDate(doc.expiresAt)}</span>
                        )}
                        {doc.uploadedAt && (
                          <span>Enviado: {formatDate(doc.uploadedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                    {doc.fileUrl && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc.id)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc.id)}
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupplierDocumentsTab;
