import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, FileText, CheckCircle, AlertTriangle, XCircle, Clock,
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

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const getUniqueSuppliers = () => {
        const suppliers = new Map<string, string>();
        documents.forEach(doc => {
            if (!suppliers.has(doc.company.id)) {
                suppliers.set(doc.company.id, doc.company.tradeName);
            }
        });
        return Array.from(suppliers.entries()).map(([id, name]) => ({ id, name }));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                                <FolderOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Documentos das Facções</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Visualize e gerencie documentos de compliance
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            {stats && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard
                            label="Total"
                            value={stats.total}
                            icon={FileText}
                            color="brand"
                        />
                        <StatCard
                            label="Válidos"
                            value={stats.valid}
                            icon={CheckCircle}
                            color="green"
                        />
                        <StatCard
                            label="Vencendo"
                            value={stats.expiringSoon}
                            icon={AlertTriangle}
                            color="yellow"
                        />
                        <StatCard
                            label="Vencidos"
                            value={stats.expired}
                            icon={XCircle}
                            color="red"
                        />
                        <StatCard
                            label="Pendentes"
                            value={stats.pending}
                            icon={Clock}
                            color="gray"
                        />
                        <StatCard
                            label="Facções"
                            value={stats.suppliersCount}
                            icon={Factory}
                            color="purple"
                        />
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por facção ou tipo de documento..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as SupplierDocumentStatus | '')}
                        className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">Todos os Status</option>
                        <option value="VALID">Válidos</option>
                        <option value="EXPIRING_SOON">Vencendo</option>
                        <option value="EXPIRED">Vencidos</option>
                        <option value="PENDING">Pendentes</option>
                    </select>

                    {/* Type Filter */}
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as SupplierDocumentType | '')}
                        className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-xs"
                    >
                        <option value="">Todos os Tipos</option>
                        {Object.entries(SUPPLIER_DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Documents Table */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-900 dark:text-white font-medium">Nenhum documento encontrado</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Tente ajustar os filtros de busca
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Facção
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Documento
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Vencimento
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Upload
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredDocuments.map((doc) => {
                                        const statusConfig = STATUS_CONFIG[doc.status];
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-4">
                                                    <button
                                                        onClick={() => openSupplierDocuments({ id: doc.company.id, name: doc.company.tradeName })}
                                                        className="flex items-center gap-3 text-left group"
                                                    >
                                                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                            <Factory className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                                {doc.company.tradeName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {doc.company.document}
                                                            </p>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {SUPPLIER_DOCUMENT_TYPE_LABELS[doc.type]}
                                                    </p>
                                                    {doc.fileName && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                                            {doc.fileName}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                                        <StatusIcon className="w-3.5 h-3.5" />
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                                    {formatDate(doc.expiresAt)}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDate(doc.uploadedAt)}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {doc.fileUrl && (
                                                            <>
                                                                <a
                                                                    href={doc.fileUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                    title="Visualizar"
                                                                >
                                                                    <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                                </a>
                                                                <a
                                                                    href={doc.fileUrl}
                                                                    download
                                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                    title="Download"
                                                                >
                                                                    <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                                </a>
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
                    </div>
                )}
            </div>

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
    color: 'brand' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => {
    const colorClasses: Record<string, { bg: string; icon: string }> = {
        brand: { bg: 'bg-brand-100 dark:bg-brand-500/10', icon: 'text-brand-600 dark:text-brand-400' },
        green: { bg: 'bg-green-100 dark:bg-green-500/10', icon: 'text-green-600 dark:text-green-400' },
        yellow: { bg: 'bg-yellow-100 dark:bg-yellow-500/10', icon: 'text-yellow-600 dark:text-yellow-400' },
        red: { bg: 'bg-red-100 dark:bg-red-500/10', icon: 'text-red-600 dark:text-red-400' },
        gray: { bg: 'bg-gray-100 dark:bg-gray-500/10', icon: 'text-gray-600 dark:text-gray-400' },
        purple: { bg: 'bg-purple-100 dark:bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400' },
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClasses[color].bg}`}>
                    <Icon className={`w-5 h-5 ${colorClasses[color].icon}`} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
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
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    // Group documents by category
    const complianceDocs = documents.filter(d =>
        ['CNPJ_ATIVO', 'CND_FEDERAL', 'CRF_FGTS', 'CONTRATO_SOCIAL', 'INSCRICAO_MUNICIPAL', 'ABVTEX_TERMO'].includes(d.type)
    );
    const safetyDocs = documents.filter(d =>
        ['LAUDO_NR1_GRO_PGR', 'LAUDO_NR7_PCMSO', 'LAUDO_NR10_SEGURANCA_ELETRICA', 'LAUDO_NR15_INSALUBRIDADE', 'LAUDO_NR17_AET'].includes(d.type)
    );
    const licenseDocs = documents.filter(d =>
        ['LICENCA_FUNCIONAMENTO', 'AVCB', 'LICENCA_AMBIENTAL'].includes(d.type)
    );
    const monthlyDocs = documents.filter(d =>
        ['GUIA_INSS', 'GUIA_FGTS', 'GUIA_SIMPLES_DAS', 'RELATORIO_EMPREGADOS'].includes(d.type)
    );
    const otherDocs = documents.filter(d =>
        ['RELACAO_SUBCONTRATADOS', 'OUTRO'].includes(d.type)
    );

    const DocumentSection = ({ title, docs }: { title: string; docs: SupplierDocument[] }) => {
        if (docs.length === 0) return null;

        return (
            <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
                <div className="space-y-2">
                    {docs.map((doc) => {
                        const statusConfig = STATUS_CONFIG[doc.status];
                        const StatusIcon = statusConfig.icon;

                        return (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded ${statusConfig.bgColor}`}>
                                        <StatusIcon className={`w-4 h-4 ${statusConfig.textColor}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {SUPPLIER_DOCUMENT_TYPE_LABELS[doc.type]}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {doc.expiresAt ? `Vence: ${formatDate(doc.expiresAt)}` : 'Sem vencimento'}
                                        </p>
                                    </div>
                                </div>
                                {doc.fileUrl && (
                                    <div className="flex items-center gap-1">
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                        >
                                            <Eye className="w-4 h-4 text-gray-500" />
                                        </a>
                                        <a
                                            href={doc.fileUrl}
                                            download
                                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                        >
                                            <Download className="w-4 h-4 text-gray-500" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                            <Factory className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{supplier.name}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Documentos da facção</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-900 dark:text-white font-medium">Nenhum documento cadastrado</p>
                        </div>
                    ) : (
                        <>
                            <DocumentSection title="Compliance e Regularidade" docs={complianceDocs} />
                            <DocumentSection title="Licenças e Autorizações" docs={licenseDocs} />
                            <DocumentSection title="Segurança do Trabalho" docs={safetyDocs} />
                            <DocumentSection title="Documentos Mensais" docs={monthlyDocs} />
                            <DocumentSection title="Outros" docs={otherDocs} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentsPage;
