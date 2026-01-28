import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Mail, MessageCircle, TrendingUp, Clock as ClockIcon,
    Loader2, FileX, Copy, XCircle, RefreshCw, ChevronDown, ChevronUp,
    Send, Eye, CheckCircle, Calendar
} from 'lucide-react';
import { credentialsService } from '../../../services';
import { InvitationStatusCard } from '../../../components/credentials/InvitationStatusCard';
import type { CredentialInvitation, InvitationChannel } from '../../../types/credentials';

interface InvitationMetrics {
    totalSent: number;
    openRate: number;
    clickRate: number;
    expired: number;
}

interface InvitationWithDetails extends CredentialInvitation {
    credentialName?: string;
    credentialCnpj?: string;
}

type StatusFilter = 'ALL' | 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'EXPIRED';
type ChannelFilter = 'ALL' | 'EMAIL' | 'WHATSAPP' | 'BOTH';
type PeriodFilter = '7' | '30' | '90' | 'custom';

const InvitationManagementPage: React.FC = () => {
    const [metrics, setMetrics] = useState<InvitationMetrics>({
        totalSent: 0,
        openRate: 0,
        clickRate: 0,
        expired: 0,
    });
    const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    useEffect(() => {
        loadInvitations();
    }, [statusFilter, channelFilter, periodFilter]);

    const loadInvitations = async () => {
        try {
            setIsLoading(true);

            const filters: any = {};

            if (statusFilter !== 'ALL') {
                filters.status = statusFilter;
            }

            if (channelFilter !== 'ALL') {
                filters.channel = channelFilter;
            }

            if (periodFilter === 'custom' && customDateFrom && customDateTo) {
                filters.dateFrom = customDateFrom;
                filters.dateTo = customDateTo;
            } else if (periodFilter !== 'custom') {
                const days = parseInt(periodFilter);
                const dateFrom = new Date();
                dateFrom.setDate(dateFrom.getDate() - days);
                filters.dateFrom = dateFrom.toISOString();
            }

            const response = await credentialsService.getInvitations(filters);
            setInvitations(response.invitations);
            setMetrics(response.metrics);
        } catch (error) {
            console.error('Error loading invitations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async (credentialId: string, invitationId: string) => {
        if (!window.confirm('Deseja reenviar este convite?')) return;

        try {
            await credentialsService.resendInvite(credentialId, invitationId);
            alert('Convite reenviado com sucesso!');
            loadInvitations();
        } catch (error) {
            console.error('Error resending invitation:', error);
            alert('Erro ao reenviar convite');
        }
    };

    const handleCopyLink = (token: string) => {
        const link = `${window.location.origin}/onboarding/${token}`;
        navigator.clipboard.writeText(link);
        alert('Link copiado para área de transferência!');
    };

    const handleCancel = async (credentialId: string, invitationId: string) => {
        if (!window.confirm('Tem certeza que deseja cancelar este convite?')) return;

        try {
            await credentialsService.cancelInvitation(credentialId, invitationId);
            alert('Convite cancelado com sucesso!');
            loadInvitations();
        } catch (error) {
            console.error('Error canceling invitation:', error);
            alert('Erro ao cancelar convite');
        }
    };

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const canResend = (invitation: CredentialInvitation): boolean => {
        const now = new Date();
        const expiresAt = new Date(invitation.expiresAt);
        const resendCount = (invitation.metadata?.resendCount || 0);
        return expiresAt > now && resendCount < 5;
    };

    const formatDate = (date: string): string => {
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCNPJ = (cnpj: string): string => {
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) return cnpj;
        return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8">
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Gestão de Convites
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Acompanhe o status e engajamento dos convites enviados
                    </p>
                </div>
                <Link
                    to="/brand/credenciamento"
                    className="px-4 py-2 text-brand-600 hover:text-brand-500 font-medium transition-colors"
                >
                    Voltar para Lista
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Status Filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        >
                            <option value="ALL">Todos</option>
                            <option value="PENDING">Pendente</option>
                            <option value="SENT">Enviado</option>
                            <option value="DELIVERED">Entregue</option>
                            <option value="OPENED">Aberto</option>
                            <option value="CLICKED">Clicado</option>
                            <option value="EXPIRED">Expirado</option>
                        </select>
                    </div>

                    {/* Channel Filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Canal
                        </label>
                        <select
                            value={channelFilter}
                            onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        >
                            <option value="ALL">Todos</option>
                            <option value="EMAIL">Email</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="BOTH">Ambos</option>
                        </select>
                    </div>

                    {/* Period Filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Período
                        </label>
                        <select
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        >
                            <option value="7">Últimos 7 dias</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="90">Últimos 90 dias</option>
                            <option value="custom">Período customizado</option>
                        </select>
                    </div>

                    {periodFilter === 'custom' && (
                        <>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data Inicial
                                </label>
                                <input
                                    type="date"
                                    value={customDateFrom}
                                    onChange={(e) => setCustomDateFrom(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data Final
                                </label>
                                <input
                                    type="date"
                                    value={customDateTo}
                                    onChange={(e) => setCustomDateTo(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={loadInvitations}
                                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Aplicar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={Send}
                    label="Convites Enviados"
                    value={metrics.totalSent}
                    color="blue"
                />
                <MetricCard
                    icon={Eye}
                    label="Taxa de Abertura"
                    value={`${metrics.openRate.toFixed(1)}%`}
                    color="green"
                />
                <MetricCard
                    icon={TrendingUp}
                    label="Taxa de Conversão"
                    value={`${metrics.clickRate.toFixed(1)}%`}
                    color="purple"
                />
                <MetricCard
                    icon={ClockIcon}
                    label="Convites Expirados"
                    value={metrics.expired}
                    color="amber"
                />
            </div>

            {/* Invitations List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Timeline de Convites
                </h3>

                {invitations.length === 0 ? (
                    <div className="text-center py-12">
                        <FileX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                            Nenhum convite encontrado
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {invitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                            >
                                {/* Header Row */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <button
                                                onClick={() => toggleRow(invitation.id)}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                            >
                                                {expandedRows.has(invitation.id) ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                )}
                                            </button>

                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {invitation.credentialName || 'Nome não disponível'}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {invitation.credentialCnpj && formatCNPJ(invitation.credentialCnpj)}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {invitation.channel === 'EMAIL' && (
                                                    <Mail className="w-4 h-4 text-blue-500" />
                                                )}
                                                {invitation.channel === 'WHATSAPP' && (
                                                    <MessageCircle className="w-4 h-4 text-green-500" />
                                                )}
                                                {invitation.channel === 'BOTH' && (
                                                    <>
                                                        <Mail className="w-4 h-4 text-blue-500" />
                                                        <MessageCircle className="w-4 h-4 text-green-500" />
                                                    </>
                                                )}
                                            </div>

                                            <StatusBadge status={invitation.status} />

                                            {invitation.metadata?.resendCount && invitation.metadata.resendCount > 0 && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                                    {invitation.metadata.resendCount} reenvio(s)
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 ml-4">
                                            {canResend(invitation) && (
                                                <button
                                                    onClick={() => handleResend(invitation.credentialId, invitation.id)}
                                                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                    title="Reenviar"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCopyLink(invitation.token)}
                                                className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                                title="Copiar Link"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            {invitation.status !== 'ACCEPTED' && invitation.status !== 'EXPIRED' && (
                                                <button
                                                    onClick={() => handleCancel(invitation.credentialId, invitation.id)}
                                                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedRows.has(invitation.id) && (
                                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                        <InvitationStatusCard invitation={invitation} />

                                        {/* Additional Details */}
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-1">Enviado para:</p>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {invitation.sentTo}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-1">Expira em:</p>
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {formatDate(invitation.expiresAt)}
                                                </p>
                                            </div>
                                            {invitation.customMessage && (
                                                <div className="col-span-2">
                                                    <p className="text-gray-500 dark:text-gray-400 mb-1">Mensagem personalizada:</p>
                                                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                                        {invitation.customMessage}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper Components
interface MetricCardProps {
    icon: React.ElementType;
    label: string;
    value: number | string;
    color: 'blue' | 'green' | 'purple' | 'amber';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string }> = {
        PENDING: { label: 'Pendente', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
        SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        DELIVERED: { label: 'Entregue', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
        OPENED: { label: 'Aberto', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        CLICKED: { label: 'Clicado', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
        ACCEPTED: { label: 'Aceito', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        DECLINED: { label: 'Recusado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        EXPIRED: { label: 'Expirado', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    };

    const { label, color } = config[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

    return (
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${color}`}>
            {label}
        </span>
    );
};

export default InvitationManagementPage;
