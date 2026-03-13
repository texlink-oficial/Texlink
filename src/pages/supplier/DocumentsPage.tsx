import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText, Upload, CheckCircle, AlertTriangle, XCircle, Clock,
    ArrowLeft, Download, Trash2, Eye, Calendar, Filter, RefreshCw
} from 'lucide-react';
import { supplierDocumentsService } from '../../services/supplierDocuments.service';
import type {
    SupplierDocument,
    SupplierDocumentSummary,
    SupplierDocumentChecklistItem,
    SupplierDocumentType,
    SupplierDocumentStatus,
} from '../../types';
import { SUPPLIER_DOCUMENT_TYPE_LABELS } from '../../types';

const STATUS_CONFIG: Record<SupplierDocumentStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    VALID: { label: 'Válido', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-500/10', icon: CheckCircle },
    EXPIRING_SOON: { label: 'Vencendo', color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-500/10', icon: AlertTriangle },
    EXPIRED: { label: 'Vencido', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-500/10', icon: XCircle },
    PENDING: { label: 'Pendente', color: 'text-brand-600 dark:text-brand-400', bgColor: 'bg-brand-100 dark:bg-brand-500/10', icon: Clock },
};

const DocumentsPage: React.FC = () => {
    const [documents, setDocuments] = useState<SupplierDocument[]>([]);
    const [checklist, setChecklist] = useState<SupplierDocumentChecklistItem[]>([]);
    const [summary, setSummary] = useState<SupplierDocumentSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<SupplierDocumentStatus | ''>('');
    const [uploadingType, setUploadingType] = useState<SupplierDocumentType | null>(null);
    const [expiryDate, setExpiryDate] = useState('');
    const [competenceMonth, setCompetenceMonth] = useState('');
    const [competenceYear, setCompetenceYear] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [docs, check, sum] = await Promise.all([
                supplierDocumentsService.getAll(),
                supplierDocumentsService.getChecklist(),
                supplierDocumentsService.getSummary(),
            ]);
            setDocuments(docs);
            setChecklist(check);
            setSummary(sum);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadClick = (type: SupplierDocumentType, item: SupplierDocumentChecklistItem) => {
        setUploadingType(type);
        setExpiryDate('');
        setCompetenceMonth('');
        setCompetenceYear('');
        // Only trigger file picker immediately if no extra metadata is needed
        // Otherwise, let the modal render first so user fills in expiry/competence
        if (!item.requiresExpiry && !item.isMonthly) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingType) return;

        try {
            const item = checklist.find(c => c.type === uploadingType);
            const dto = {
                type: uploadingType,
                ...(item?.requiresExpiry && expiryDate ? { expiresAt: expiryDate } : {}),
                ...(item?.isMonthly && competenceMonth ? { competenceMonth: parseInt(competenceMonth) } : {}),
                ...(item?.isMonthly && competenceYear ? { competenceYear: parseInt(competenceYear) } : {}),
            };

            if (item?.documentId) {
                await supplierDocumentsService.uploadFile(item.documentId, file);
            } else {
                await supplierDocumentsService.createWithFile(dto, file);
            }

            await loadData();
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setUploadingType(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleView = async (id: string) => {
        try {
            const { url } = await supplierDocumentsService.getDownloadUrl(id);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error viewing document:', error);
        }
    };

    const handleDownload = async (id: string) => {
        try {
            const { url } = await supplierDocumentsService.getDownloadUrl(id);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error downloading document:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este documento?')) return;

        try {
            await supplierDocumentsService.delete(id);
            await loadData();
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const formatFileSize = (bytes: number | undefined) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const filteredChecklist = checklist.filter(item =>
        !statusFilter || item.status === statusFilter
    );

    if (isLoading) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-24">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
            />

            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/portal" className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Documentos</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie seus documentos de compliance e fiscal</p>
                            </div>
                        </div>
                        <button
                            onClick={loadData}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Summary Cards */}
            {summary && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4 border border-green-200 dark:border-green-500/20">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.valid}</div>
                            <div className="text-sm text-green-600 dark:text-green-400/70">Válidos</div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-500/20">
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary.expiringSoon}</div>
                            <div className="text-sm text-yellow-600 dark:text-yellow-400/70">Vencendo</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/20">
                            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.expired}</div>
                            <div className="text-sm text-red-600 dark:text-red-400/70">Vencidos</div>
                        </div>
                        <div className="bg-brand-50 dark:bg-brand-500/10 rounded-xl p-4 border border-brand-200 dark:border-brand-500/20">
                            <div className="text-2xl font-bold text-brand-700 dark:text-brand-400">{summary.pending}</div>
                            <div className="text-sm text-brand-600 dark:text-brand-400/70">Pendentes</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
                <div className="flex items-center gap-4">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as SupplierDocumentStatus | '')}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                        <option value="">Todos os status</option>
                        <option value="VALID">Válidos</option>
                        <option value="EXPIRING_SOON">Vencendo em breve</option>
                        <option value="EXPIRED">Vencidos</option>
                        <option value="PENDING">Pendentes</option>
                    </select>
                </div>
            </div>

            {/* Documents Checklist */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredChecklist.map((item) => {
                            const statusConfig = STATUS_CONFIG[item.status];
                            const StatusIcon = statusConfig.icon;
                            const doc = documents.find(d => d.id === item.documentId);

                            return (
                                <div
                                    key={item.type}
                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                                                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-gray-900 dark:text-white font-medium truncate">
                                                    {SUPPLIER_DOCUMENT_TYPE_LABELS[item.type]}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {statusConfig.label}
                                                    </span>
                                                    {item.isMonthly && (
                                                        <span className="text-gray-400 dark:text-gray-500 text-xs">Mensal</span>
                                                    )}
                                                    {item.requiresExpiry && !item.expiresAt && (
                                                        <span className="text-gray-400 dark:text-gray-500 text-xs">Requer validade</span>
                                                    )}
                                                    {item.expiresAt && (
                                                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                                                            <Calendar className="w-3 h-3" />
                                                            Validade: {formatDate(item.expiresAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                {doc?.fileName && (
                                                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                        <FileText className="w-4 h-4" />
                                                        <span className="truncate">{doc.fileName}</span>
                                                        <span className="text-gray-400 dark:text-gray-500">
                                                            ({formatFileSize(doc.fileSize)})
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {doc?.fileUrl && (
                                                <>
                                                    <button
                                                        onClick={() => doc.id && handleView(doc.id)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="Visualizar"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => doc.id && handleDownload(doc.id)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => doc.id && handleDelete(doc.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleUploadClick(item.type, item)}
                                                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <Upload className="w-4 h-4" />
                                                {item.hasFile ? 'Atualizar' : 'Enviar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Upload Modal for documents requiring extra info */}
            {uploadingType && checklist.find(c => c.type === uploadingType)?.requiresExpiry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            {SUPPLIER_DOCUMENT_TYPE_LABELS[uploadingType]}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Data de Validade
                                </label>
                                <input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setUploadingType(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={!expiryDate}
                                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Selecionar Arquivo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal for monthly documents */}
            {uploadingType && checklist.find(c => c.type === uploadingType)?.isMonthly && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            {SUPPLIER_DOCUMENT_TYPE_LABELS[uploadingType]}
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mês de Competência
                                    </label>
                                    <select
                                        value={competenceMonth}
                                        onChange={(e) => setCompetenceMonth(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    >
                                        <option value="">Selecione</option>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Ano
                                    </label>
                                    <select
                                        value={competenceYear}
                                        onChange={(e) => setCompetenceYear(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    >
                                        <option value="">Selecione</option>
                                        {Array.from({ length: 5 }, (_, i) => {
                                            const year = new Date().getFullYear() - i;
                                            return <option key={year} value={year}>{year}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setUploadingType(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={!competenceMonth || !competenceYear}
                                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Selecionar Arquivo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
