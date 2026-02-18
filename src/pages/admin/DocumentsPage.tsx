import React, { useEffect, useState } from 'react';
import {
    FileText, CheckCircle, AlertTriangle, XCircle, Clock,
    Filter, Search, Factory, Download, Eye, X, RefreshCw, FolderOpen
} from 'lucide-react';
import { adminDocumentsService, AdminDocument, AdminDocumentStats } from '../../services/adminDocuments.service';
import { SUPPLIER_DOCUMENT_TYPE_LABELS } from '../../types';
import type { SupplierDocumentType, SupplierDocumentStatus, SupplierDocument } from '../../types';

const STATUS_CONFIG: Record<SupplierDocumentStatus, {
    label: string;
    icon: React.ElementType;
    bgColor: string;
    textColor: string;
    borderColor: string;
}> = {
    VALID: {
        label: 'Válido',
        icon: CheckCircle,
        bgColor: 'bg-green-100 dark:bg-green-500/10',
        textColor: 'text-green-700 dark:text-green-400',
        borderColor: 'border-green-200 dark:border-green-500/30'
    },
    EXPIRING_SOON: {
        label: 'Vencendo',
        icon: AlertTriangle,
        bgColor: 'bg-yellow-100 dark:bg-yellow-500/10',
        textColor: 'text-yellow-700 dark:text-yellow-400',
        borderColor: 'border-yellow-200 dark:border-yellow-500/30'
    },
    EXPIRED: {
        label: 'Vencido',
        icon: XCircle,
        bgColor: 'bg-red-100 dark:bg-red-500/10',
        textColor: 'text-red-700 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-500/30'
    },
    PENDING: {
        label: 'Pendente',
        icon: Clock,
        bgColor: 'bg-gray-100 dark:bg-gray-500/10',
        textColor: 'text-gray-700 dark:text-gray-400',
        borderColor: 'border-gray-200 dark:border-gray-500/30'
    },
};

const DocumentsPage: React.FC = () => {
    const [documents, setDocuments] = useState<AdminDocument[]>([]);
    const [stats, setStats] = useState<AdminDocumentStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<SupplierDocumentStatus | ''>('');
    const [selectedType, setSelectedType] = useState<SupplierDocumentType | ''>('');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [modalSupplier, setModalSupplier] = useState<{ id: string; name: string } | null>(null);
    const [supplierDocuments, setSupplierDocuments] = useState<SupplierDocument[]>([]);
    const [isLoadingModal, setIsLoadingModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [selectedStatus, selectedType, selectedSupplier]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [docsData, statsData] = await Promise.all([
                adminDocumentsService.getAllDocuments(
                    selectedSupplier || undefined,
                    selectedType || undefined,
                    selectedStatus || undefined
                ),
                adminDocumentsService.getStats(),
            ]);
            setDocuments(docsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openSupplierDocuments = async (supplier: { id: string; name: string }) => {
        setModalSupplier(supplier);
        setShowSupplierModal(true);
        setIsLoadingModal(true);
        try {
            const docs = await adminDocumentsService.getSupplierDocuments(supplier.id);
            setSupplierDocuments(docs);
        } catch (error) {
            console.error('Error loading supplier documents:', error);
        } finally {
            setIsLoadingModal(false);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.company.tradeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        SUPPLIER_DOCUMENT_TYPE_LABELS[doc.type].toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDownload = async (docId: string) => {
        try {
            const { url } = await adminDocumentsService.getDownloadUrl(docId);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error getting download URL:', error);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    return (
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/5">
                            <FolderOpen className="w-6 h-6 text-sky-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">Documentos de Compliance</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Gestão centralizada de documentos das facções de costura</p>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
                        <StatCard label="Total" value={stats.total} icon={FileText} color="sky" />
                        <StatCard label="Válidos" value={stats.valid} icon={CheckCircle} color="emerald" />
                        <StatCard label="Vencendo" value={stats.expiringSoon} icon={AlertTriangle} color="amber" />
                        <StatCard label="Vencidos" value={stats.expired} icon={XCircle} color="red" />
                        <StatCard label="Pendentes" value={stats.pending} icon={Clock} color="gray" />
                        <StatCard label="Facções de Costura" value={stats.suppliersCount} icon={Factory} color="indigo" />
                    </div>
                )}

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por facção de costura ou documento..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="relative group w-48">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value as SupplierDocumentStatus | '')}
                                className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                            >
                                <option value="">Todos Status</option>
                                <option value="VALID">Válidos</option>
                                <option value="EXPIRING_SOON">Vencendo</option>
                                <option value="EXPIRED">Vencidos</option>
                                <option value="PENDING">Pendentes</option>
                            </select>
                        </div>

                        <div className="relative group w-64">
                            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value as SupplierDocumentType | '')}
                                className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm transition-all font-medium"
                            >
                                <option value="">Todos Tipos</option>
                                {Object.entries(SUPPLIER_DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Content Table */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-sky-500/20 blur-xl rounded-full animate-pulse" />
                                    <RefreshCw className="w-10 h-10 text-sky-500 animate-spin relative" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Carregando documentos...</p>
                            </div>
                        ) : filteredDocuments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                    <FileText className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">Nenhum documento encontrado</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-xs mt-1">
                                    Tente ajustar os filtros ou pesquisar por outro termo.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06]">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Facção</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Documento</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Vencimento</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                                    {filteredDocuments.map((doc) => {
                                        const statusConfig = STATUS_CONFIG[doc.status];
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => openSupplierDocuments({ id: doc.company.id, name: doc.company.tradeName })}
                                                        className="flex items-center gap-3 text-left group/btn"
                                                    >
                                                        <div className="w-10 h-10 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/[0.08] rounded-xl flex items-center justify-center transition-all group-hover/btn:border-sky-500/50">
                                                            <Factory className="w-5 h-5 text-gray-400 group-hover/btn:text-sky-500 transition-colors" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white group-hover/btn:text-sky-500 transition-colors font-display">
                                                                {doc.company.tradeName}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wider mt-0.5 font-mono">
                                                                {doc.company.document}
                                                            </p>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {SUPPLIER_DOCUMENT_TYPE_LABELS[doc.type]}
                                                        </p>
                                                        {doc.fileName && (
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-500 truncate max-w-[200px] mt-0.5">
                                                                {doc.fileName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300">
                                                        {formatDate(doc.expiresAt)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {doc.fileUrl && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleDownload(doc.id)}
                                                                    className="p-2 text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-xl transition-all"
                                                                    title="Visualizar"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownload(doc.id)}
                                                                    className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                                                                    title="Download"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Supplier Documents Modal */}
            {showSupplierModal && modalSupplier && (
                <SupplierDocumentsModal
                    supplier={modalSupplier}
                    documents={supplierDocuments}
                    isLoading={isLoadingModal}
                    onClose={() => {
                        setShowSupplierModal(false);
                        setModalSupplier(null);
                        setSupplierDocuments([]);
                    }}
                />
            )}
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${color}-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <div>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white font-display leading-none mb-1">{value}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                </div>
            </div>
        </div>
    );
};

// Supplier Documents Modal Component
interface SupplierDocumentsModalProps {
    supplier: { id: string; name: string };
    documents: SupplierDocument[];
    isLoading: boolean;
    onClose: () => void;
}

const SupplierDocumentsModal: React.FC<SupplierDocumentsModalProps> = ({
    supplier,
    documents,
    isLoading,
    onClose,
}) => {
    const handleDownload = async (docId: string) => {
        try {
            const { url } = await adminDocumentsService.getDownloadUrl(docId);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error getting download URL:', error);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const sections = [
        {
            title: "Compliance e Regularidade",
            docs: documents.filter(d => ['CNPJ_ATIVO', 'CND_FEDERAL', 'CRF_FGTS', 'CONTRATO_SOCIAL', 'INSCRICAO_MUNICIPAL', 'ABVTEX_TERMO'].includes(d.type))
        },
        {
            title: "Licenças e Autorizações",
            docs: documents.filter(d => ['LICENCA_FUNCIONAMENTO', 'AVCB', 'LICENCA_AMBIENTAL'].includes(d.type))
        },
        {
            title: "Segurança do Trabalho",
            docs: documents.filter(d => ['LAUDO_NR1_GRO_PGR', 'LAUDO_NR7_PCMSO', 'LAUDO_NR10_SEGURANCA_ELETRICA', 'LAUDO_NR15_INSALUBRIDADE', 'LAUDO_NR17_AET'].includes(d.type))
        },
        {
            title: "Documentos Mensais",
            docs: documents.filter(d => ['GUIA_INSS', 'GUIA_FGTS', 'GUIA_SIMPLES_DAS', 'RELATORIO_EMPREGADOS'].includes(d.type))
        },
        {
            title: "Outros",
            docs: documents.filter(d => ['RELACAO_SUBCONTRATADOS', 'OUTRO'].includes(d.type))
        }
    ];

    const DocumentRow: React.FC<{ doc: SupplierDocument }> = ({ doc }) => {
        const statusConfig = STATUS_CONFIG[doc.status];
        const StatusIcon = statusConfig.icon;

        return (
            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] rounded-xl hover:border-sky-500/30 transition-all group">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig.textColor}`} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white font-display">
                            {SUPPLIER_DOCUMENT_TYPE_LABELS[doc.type]}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            {doc.expiresAt ? `Expira em ${formatDate(doc.expiresAt)}` : 'Documento Permanente'}
                        </p>
                    </div>
                </div>
                {doc.fileUrl && (
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleDownload(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-lg transition-all"
                        >
                            <span className="sr-only">Visualizar</span>
                            <Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDownload(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                        >
                            <span className="sr-only">Download</span>
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/[0.06] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/5">
                            <Factory className="w-6 h-6 text-sky-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display leading-tight">{supplier.name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pasta Documental de Compliance</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <RefreshCw className="w-10 h-10 text-sky-500 animate-spin" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Recuperando arquivos...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">Nenhum documento cadastrado</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">Ainda não existem arquivos vinculados a esta pasta documental.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sections.map(section => section.docs.length > 0 && (
                                <div key={section.title}>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">{section.title}</h4>
                                    <div className="space-y-2">
                                        {section.docs.map(doc => <DocumentRow key={doc.id} doc={doc} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentsPage;
