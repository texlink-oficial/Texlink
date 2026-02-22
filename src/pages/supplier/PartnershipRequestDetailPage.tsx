import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Calendar,
    Clock,
    MessageSquare,
    CheckCircle,
    XCircle,
    User,
    Loader2,
    Inbox,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PartnershipRequestBadge } from '../../components/partnership-requests/PartnershipRequestBadge';
import { RespondRequestModal } from '../../components/partnership-requests/RespondRequestModal';
import {
    partnershipRequestsService,
    type PartnershipRequest,
} from '../../services/partnershipRequests.service';

const PartnershipRequestDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [request, setRequest] = useState<PartnershipRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Respond modal state
    const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadRequest = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);
            const data = await partnershipRequestsService.getById(id);
            setRequest(data);
        } catch (err) {
            setError('Erro ao carregar solicitação de parceria');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadRequest();
    }, [loadRequest]);

    const handleRespond = async (data: { accepted: boolean; rejectionReason?: string; documentSharingConsent?: boolean }) => {
        if (!request) return;
        setIsSubmitting(true);
        try {
            await partnershipRequestsService.respond(request.id, data);
            setIsRespondModalOpen(false);
            loadRequest();
        } catch (err) {
            alert('Erro ao responder solicitação');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDaysUntilExpiration = (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diffTime = expires.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="p-6">
                <Link
                    to="/portal/solicitacoes"
                    className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para Solicitações
                </Link>
                <div className="text-center py-16">
                    <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Solicitação não encontrada
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {error || 'Esta solicitação de parceria não existe ou foi removida.'}
                    </p>
                </div>
            </div>
        );
    }

    const brand = request.brand;
    const brandName = brand?.tradeName || brand?.legalName || 'Marca';
    const isPending = request.status === 'PENDING';
    const daysLeft = isPending ? getDaysUntilExpiration(request.expiresAt) : null;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Back link */}
            <Link
                to="/portal/solicitacoes"
                className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Solicitações
            </Link>

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-2xl">
                                {brandName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {brandName}
                                </h1>
                                {brand && (
                                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        <MapPin className="w-4 h-4" />
                                        <span>{brand.city}, {brand.state}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <PartnershipRequestBadge status={request.status} showDot={isPending} />
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Enviada em</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatDate(request.createdAt)}
                                </p>
                            </div>
                        </div>

                        {isPending && daysLeft !== null && (
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${
                                daysLeft <= 3
                                    ? 'bg-red-50 dark:bg-red-900/20'
                                    : 'bg-yellow-50 dark:bg-yellow-900/20'
                            }`}>
                                <Clock className={`w-5 h-5 ${
                                    daysLeft <= 3 ? 'text-red-500' : 'text-yellow-500'
                                }`} />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Expira em</p>
                                    <p className={`text-sm font-medium ${
                                        daysLeft <= 3
                                            ? 'text-red-700 dark:text-red-400'
                                            : 'text-yellow-700 dark:text-yellow-400'
                                    }`}>
                                        {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {request.respondedAt && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <User className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Respondida em</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatDate(request.respondedAt)}
                                        {request.respondedBy && ` por ${request.respondedBy.name}`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {request.requestedBy && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <Building2 className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Solicitada por</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {request.requestedBy.name}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message from Brand */}
                    {request.message && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                            <div className="flex items-start gap-3">
                                <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                                        Mensagem da marca
                                    </p>
                                    <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
                                        {request.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status-specific sections */}
                    {request.status === 'ACCEPTED' && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-6">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                    Parceria aceita. Um relacionamento foi criado com esta marca.
                                </p>
                            </div>
                        </div>
                    )}

                    {request.status === 'REJECTED' && request.rejectionReason && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mb-6">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                                        Motivo da recusa
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-300">
                                        {request.rejectionReason}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {isPending && (
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="primary"
                                onClick={() => setIsRespondModalOpen(true)}
                            >
                                Responder Solicitação
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Respond Modal */}
            {request && (
                <RespondRequestModal
                    isOpen={isRespondModalOpen}
                    onClose={() => setIsRespondModalOpen(false)}
                    onSubmit={handleRespond}
                    request={request}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};

export default PartnershipRequestDetailPage;
