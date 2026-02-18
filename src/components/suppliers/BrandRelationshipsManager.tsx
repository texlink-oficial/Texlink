import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  ShieldOff,
  FileText,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { relationshipsService, type ConsentStatus } from '../../services/relationships.service';
import type { SupplierBrandRelationship } from '../../types/relationships';

interface BrandRelationshipsManagerProps {
  supplierId: string;
}

interface RelationshipWithConsent extends SupplierBrandRelationship {
  consentStatus?: ConsentStatus;
}

export const BrandRelationshipsManager: React.FC<BrandRelationshipsManagerProps> = ({
  supplierId,
}) => {
  const [relationships, setRelationships] = useState<RelationshipWithConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipWithConsent | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRelationships = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await relationshipsService.getBySupplier(supplierId);

      // Fetch consent status for each active relationship
      const withConsent = await Promise.all(
        data.map(async (rel) => {
          if (rel.status === 'ACTIVE') {
            try {
              const consent = await relationshipsService.getConsentStatus(rel.id);
              return { ...rel, consentStatus: consent };
            } catch {
              return rel;
            }
          }
          return rel;
        })
      );

      setRelationships(withConsent);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar relacionamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, [supplierId]);

  const handleOpenRevokeModal = (relationship: RelationshipWithConsent) => {
    setSelectedRelationship(relationship);
    setRevokeReason('');
    setRevokeModalOpen(true);
  };

  const handleRevokeConsent = async () => {
    if (!selectedRelationship || !revokeReason.trim() || revokeReason.length < 10) {
      return;
    }

    setSubmitting(true);
    try {
      await relationshipsService.revokeConsent(selectedRelationship.id, revokeReason);
      setRevokeModalOpen(false);
      setSelectedRelationship(null);
      fetchRelationships();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao revogar consentimento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleConsent = async (relationship: RelationshipWithConsent, newConsent: boolean) => {
    try {
      await relationshipsService.updateConsent(relationship.id, newConsent);
      fetchRelationships();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar consentimento');
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
        <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <Button variant="outline" onClick={fetchRelationships} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    );
  }

  const activeRelationships = relationships.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Marcas Parceiras
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie o compartilhamento de documentos com suas marcas parceiras
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRelationships}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Sobre o compartilhamento de documentos (LGPD)</p>
            <p>
              Ao consentir, suas marcas parceiras poderão visualizar seus documentos de compliance.
              Você pode revogar este consentimento a qualquer momento, mas isso encerrará o relacionamento com a marca.
            </p>
          </div>
        </div>
      </div>

      {/* Relationships List */}
      {activeRelationships.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Nenhum relacionamento ativo encontrado
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeRelationships.map((relationship) => {
            const hasConsent = relationship.consentStatus?.documentSharingConsent ?? false;

            return (
              <div
                key={relationship.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-lg">
                      {((relationship as any).brand?.tradeName || (relationship as any).brand?.legalName || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {(relationship as any).brand?.tradeName || (relationship as any).brand?.legalName || 'Marca'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(relationship as any).brand?.city}, {(relationship as any).brand?.state}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Parceria desde: {formatDate(relationship.activatedAt || relationship.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Consent Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      hasConsent
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {hasConsent ? (
                        <>
                          <Shield className="w-3.5 h-3.5" />
                          Documentos compartilhados
                        </>
                      ) : (
                        <>
                          <ShieldOff className="w-3.5 h-3.5" />
                          Documentos privados
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {hasConsent ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleOpenRevokeModal(relationship)}
                        >
                          <ShieldOff className="w-4 h-4 mr-1" />
                          Revogar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => handleToggleConsent(relationship, true)}
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Compartilhar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consent Details */}
                {relationship.consentStatus && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {relationship.consentStatus.documentSharingConsentAt && (
                        <span>
                          <FileText className="w-3.5 h-3.5 inline mr-1" />
                          Consentido em: {formatDate(relationship.consentStatus.documentSharingConsentAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Revoke Consent Modal */}
      {revokeModalOpen && selectedRelationship && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setRevokeModalOpen(false)} />

            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Revogar Consentimento
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Esta ação encerrará o relacionamento
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Atenção:</strong> Ao revogar o consentimento, a marca{' '}
                    <strong>{(selectedRelationship as any).brand?.tradeName || 'parceira'}</strong>{' '}
                    não terá mais acesso aos seus documentos e o relacionamento será encerrado permanentemente.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="revokeReason"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Motivo da revogação <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="revokeReason"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Informe o motivo da revogação (mínimo 10 caracteres)..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                    {revokeReason.length}/500
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                <Button
                  variant="outline"
                  onClick={() => setRevokeModalOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRevokeConsent}
                  disabled={submitting || revokeReason.length < 10}
                >
                  {submitting ? 'Revogando...' : 'Revogar e Encerrar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandRelationshipsManager;
