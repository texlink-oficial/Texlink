import React, { useState, useEffect, useCallback } from 'react';
import { Inbox, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  PartnershipRequestCard,
  RespondRequestModal,
} from '../../components/partnership-requests';
import { Button } from '../../components/ui/Button';
import {
  partnershipRequestsService,
  type PartnershipRequest,
  type PartnershipRequestStatus,
} from '../../services/partnershipRequests.service';

type TabStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'all';

const tabs: { id: TabStatus; label: string; icon: React.ElementType }[] = [
  { id: 'PENDING', label: 'Pendentes', icon: Clock },
  { id: 'ACCEPTED', label: 'Aceitas', icon: CheckCircle },
  { id: 'REJECTED', label: 'Recusadas', icon: XCircle },
];

export const SupplierPartnershipRequestsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabStatus>('PENDING');
  const [requests, setRequests] = useState<PartnershipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<PartnershipRequest | null>(null);
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = activeTab !== 'all' ? activeTab as PartnershipRequestStatus : undefined;
      const response = await partnershipRequestsService.getReceived({ status });
      setRequests(response.data);
    } catch (err) {
      setError('Erro ao carregar solicitações');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenRespondModal = (request: PartnershipRequest) => {
    setSelectedRequest(request);
    setIsRespondModalOpen(true);
  };

  const handleCloseRespondModal = () => {
    setSelectedRequest(null);
    setIsRespondModalOpen(false);
  };

  const handleRespond = async (data: { accepted: boolean; rejectionReason?: string }) => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      await partnershipRequestsService.respond(selectedRequest.id, data);
      handleCloseRespondModal();
      fetchRequests();
    } catch (err) {
      console.error('Erro ao responder:', err);
      alert('Erro ao responder solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Solicitações de Marcas
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gerencie as solicitações de parceria recebidas
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'PENDING' ? pendingCount : undefined;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${isActive
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 rounded-full animate-pulse">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" onClick={fetchRequests} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhuma solicitação encontrada
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'PENDING'
              ? 'Você não tem solicitações pendentes'
              : 'Não há solicitações nesta categoria'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <PartnershipRequestCard
              key={request.id}
              request={request}
              viewType="supplier"
              onRespond={request.status === 'PENDING' ? handleOpenRespondModal : undefined}
            />
          ))}
        </div>
      )}

      {/* Respond Modal */}
      {selectedRequest && (
        <RespondRequestModal
          isOpen={isRespondModalOpen}
          onClose={handleCloseRespondModal}
          onSubmit={handleRespond}
          request={selectedRequest}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default SupplierPartnershipRequestsPage;
