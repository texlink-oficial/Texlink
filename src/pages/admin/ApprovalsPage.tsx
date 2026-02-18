import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, PendingApproval, AdminAction, SupplierDocument } from '../../services';
import {
    ArrowLeft, CheckCircle, XCircle, Factory,
    Mail, MapPin, Calendar, Loader2, AlertCircle,
    FileText, Eye, Download,
    ChevronDown, ChevronUp, Clock, Shield, X
} from 'lucide-react';

// ---- Approval Comment Modal ----
interface ApprovalModalProps {
    isOpen: boolean;
    action: 'approve' | 'reject';
    supplierName: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({
    isOpen, action, supplierName, onConfirm, onCancel, isLoading
}) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const isReject = action === 'reject';
    const isValid = isReject ? reason.trim().length > 0 : true;

    const handleConfirm = () => {
        if (isValid) onConfirm(reason.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey && isValid) {
            handleConfirm();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-white/[0.06]">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isReject ? 'bg-red-500/20' : 'bg-green-500/20'
                        }`}>
                            {isReject ? (
                                <XCircle className="w-5 h-5 text-red-400" />
                            ) : (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {isReject ? 'Rejeitar' : 'Aprovar'} Fornecedor
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{supplierName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {isReject ? 'Motivo da rejeição *' : 'Comentário (opcional)'}
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isReject
                            ? 'Informe o motivo da rejeição...'
                            : 'Adicione um comentário sobre a aprovação...'
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.1] rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none text-sm"
                        autoFocus
                    />
                    {isReject && reason.trim().length === 0 && (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Motivo obrigatório para rejeição
                        </p>
                    )}
                    <p className="mt-1.5 text-xs text-gray-400">Ctrl+Enter para confirmar</p>
                </div>

                <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-white/[0.06]">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-white/[0.1] text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid || isLoading}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                            isReject
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                        }`}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        {isReject ? 'Rejeitar' : 'Aprovar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ---- Document Status Badge ----
const DocumentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; className: string }> = {
        VALID: { label: 'Valido', className: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
        PENDING: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
        EXPIRED: { label: 'Expirado', className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
        EXPIRING_SOON: { label: 'Vencendo', className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
    };
    const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400' };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
            {c.label}
        </span>
    );
};

// ---- Document Type Label ----
const documentTypeLabels: Record<string, string> = {
    CNPJ_CARD: 'Cartão CNPJ',
    SOCIAL_CONTRACT: 'Contrato Social',
    STATE_REGISTRATION: 'Inscrição Estadual',
    MUNICIPAL_REGISTRATION: 'Inscrição Municipal',
    FGTS_CERTIFICATE: 'Certificado FGTS',
    INSS_CERTIFICATE: 'Certificado INSS',
    TAX_CLEARANCE: 'Certidão Negativa',
    FIRE_SAFETY: 'Alvará Bombeiros',
    OPERATING_LICENSE: 'Alvará Funcionamento',
    ENVIRONMENTAL_LICENSE: 'Licença Ambiental',
    OTHER: 'Outro',
};

// ---- Supplier Documents Section ----
interface SupplierDocumentsSectionProps {
    supplierId: string;
    isExpanded: boolean;
    onToggle: () => void;
}

const SupplierDocumentsSection: React.FC<SupplierDocumentsSectionProps> = ({
    supplierId, isExpanded, onToggle
}) => {
    const [documents, setDocuments] = useState<SupplierDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (isExpanded && !loaded) {
            setIsLoading(true);
            adminService.getSupplierDocuments(supplierId)
                .then((data) => {
                    setDocuments(data);
                    setLoaded(true);
                })
                .catch((err) => console.error('Error loading documents:', err))
                .finally(() => setIsLoading(false));
        }
    }, [isExpanded, loaded, supplierId]);

    return (
        <div className="mt-4 border-t border-gray-100 dark:border-white/[0.04] pt-3">
            <button
                onClick={onToggle}
                className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors font-medium"
            >
                <FileText className="w-4 h-4" />
                Documentos do Fornecedor
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isExpanded && (
                <div className="mt-3">
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando documentos...
                        </div>
                    ) : documents.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">Nenhum documento enviado</p>
                    ) : (
                        <div className="space-y-2">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 rounded-xl px-3 py-2"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                                {documentTypeLabels[doc.type] || doc.type}
                                            </p>
                                            {doc.fileName && (
                                                <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <DocumentStatusBadge status={doc.status} />
                                        {doc.fileUrl && (
                                            <div className="flex gap-1">
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-gray-400 hover:text-sky-500 rounded-lg transition-colors"
                                                    title="Visualizar"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </a>
                                                <a
                                                    href={doc.fileUrl}
                                                    download
                                                    className="p-1.5 text-gray-400 hover:text-sky-500 rounded-lg transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ---- Audit Trail Section ----
interface AuditTrailProps {
    actions: AdminAction[];
    isLoading: boolean;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ actions, isLoading }) => {
    const actionLabels: Record<string, { label: string; className: string }> = {
        APPROVED: { label: 'Aprovado', className: 'text-green-600 dark:text-green-400' },
        ACTIVATED: { label: 'Ativado', className: 'text-green-600 dark:text-green-400' },
        REJECTED: { label: 'Rejeitado', className: 'text-red-600 dark:text-red-400' },
        SUSPENDED: { label: 'Suspenso', className: 'text-orange-600 dark:text-orange-400' },
        CREATED: { label: 'Criado', className: 'text-blue-600 dark:text-blue-400' },
        UPDATED: { label: 'Atualizado', className: 'text-sky-600 dark:text-sky-400' },
        DELETED: { label: 'Excluído', className: 'text-red-600 dark:text-red-400' },
        REGISTERED: { label: 'Registrado', className: 'text-blue-600 dark:text-blue-400' },
    };

    return (
        <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Histórico de Ações Administrativas
                </h2>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                </div>
            ) : actions.length === 0 ? (
                <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nenhuma ação registrada</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acao</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fornecedor</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                                {actions.map((action) => {
                                    const label = actionLabels[action.action] || { label: action.action, className: 'text-gray-600' };
                                    return (
                                        <tr key={action.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {new Date(action.createdAt).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {action.admin.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm font-medium ${label.className}`}>
                                                    {label.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {action.company.tradeName || action.company.legalName}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                {action.reason || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---- Main Page ----
const ApprovalsPage: React.FC = () => {
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
    const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
    const [actionsLoading, setActionsLoading] = useState(true);

    // Modal state
    const [modal, setModal] = useState<{
        isOpen: boolean;
        action: 'approve' | 'reject';
        approvalId: string;
        supplierName: string;
    }>({
        isOpen: false,
        action: 'approve',
        approvalId: '',
        supplierName: '',
    });

    useEffect(() => {
        loadApprovals();
        loadAdminActions();
    }, []);

    const loadApprovals = async () => {
        try {
            const data = await adminService.getPendingApprovals();
            setApprovals(data);
        } catch (error) {
            console.error('Error loading approvals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAdminActions = async () => {
        try {
            const data = await adminService.getAdminActions(30);
            setAdminActions(data);
        } catch (error) {
            console.error('Error loading admin actions:', error);
        } finally {
            setActionsLoading(false);
        }
    };

    const openModal = (id: string, action: 'approve' | 'reject', supplierName: string) => {
        setModal({ isOpen: true, action, approvalId: id, supplierName });
    };

    const closeModal = () => {
        setModal({ isOpen: false, action: 'approve', approvalId: '', supplierName: '' });
    };

    const handleConfirmAction = async (reason: string) => {
        const { approvalId, action } = modal;
        setProcessingId(approvalId);
        try {
            const status = action === 'approve' ? 'ACTIVE' : 'SUSPENDED';
            await adminService.updateSupplierStatus(approvalId, status, reason || undefined);
            setApprovals(prev => prev.filter(a => a.id !== approvalId));
            closeModal();
            // Refresh audit trail
            loadAdminActions();
        } catch (error) {
            console.error(`Error ${action === 'approve' ? 'approving' : 'rejecting'}:`, error);
        } finally {
            setProcessingId(null);
        }
    };

    const toggleDocs = useCallback((id: string) => {
        setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    return (
        <div className="animate-fade-in">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/admin" className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aprovações Pendentes</h1>
                        <p className="text-gray-500 dark:text-gray-400">{approvals.length} facções aguardando revisão</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : approvals.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                        <p className="text-brand-300">Nenhuma aprovação pendente</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {approvals.map((approval) => (
                            <div
                                key={approval.id}
                                className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                            <Factory className="w-6 h-6 text-sky-500 dark:text-sky-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-gray-900 dark:text-white font-semibold">{approval.tradeName || approval.legalName}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{approval.document}</p>

                                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {approval.city}, {approval.state}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-4 h-4" />
                                                    {approval.companyUsers[0]?.user.email}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(approval.createdAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>

                                            {approval.supplierProfile && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {approval.supplierProfile.productTypes?.map((type) => (
                                                        <span
                                                            key={type}
                                                            className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/[0.06]"
                                                        >
                                                            {type}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openModal(
                                                approval.id,
                                                'reject',
                                                approval.tradeName || approval.legalName
                                            )}
                                            disabled={processingId === approval.id}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-xl border border-red-500/20 transition-colors disabled:opacity-50 text-sm font-medium"
                                        >
                                            {processingId === approval.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <XCircle className="w-4 h-4" />
                                            )}
                                            Rejeitar
                                        </button>
                                        <button
                                            onClick={() => openModal(
                                                approval.id,
                                                'approve',
                                                approval.tradeName || approval.legalName
                                            )}
                                            disabled={processingId === approval.id}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 dark:text-green-400 rounded-xl border border-green-500/20 transition-colors disabled:opacity-50 text-sm font-medium"
                                        >
                                            {processingId === approval.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                            Aprovar
                                        </button>
                                    </div>
                                </div>

                                {/* Supplier Documents */}
                                <SupplierDocumentsSection
                                    supplierId={approval.id}
                                    isExpanded={expandedDocs[approval.id] || false}
                                    onToggle={() => toggleDocs(approval.id)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Audit Trail */}
                <AuditTrail actions={adminActions} isLoading={actionsLoading} />

                {/* Approval Modal */}
                <ApprovalModal
                    isOpen={modal.isOpen}
                    action={modal.action}
                    supplierName={modal.supplierName}
                    onConfirm={handleConfirmAction}
                    onCancel={closeModal}
                    isLoading={processingId !== null}
                />
            </main>
        </div>
    );
};

export default ApprovalsPage;
