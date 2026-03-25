import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText, Paperclip, Trash2, Download, Search, Clock, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

interface Props {
    companyId: string;
}

type NoteCategory = 'GERAL' | 'FINANCEIRO' | 'OPERACIONAL' | 'COMERCIAL' | 'PENDENCIA' | 'ALERTA';

const CATEGORIES: { value: NoteCategory; label: string }[] = [
    { value: 'GERAL', label: 'Geral' },
    { value: 'FINANCEIRO', label: 'Financeiro' },
    { value: 'OPERACIONAL', label: 'Operacional' },
    { value: 'COMERCIAL', label: 'Comercial' },
    { value: 'PENDENCIA', label: 'Pendencia' },
    { value: 'ALERTA', label: 'Alerta' },
];

const CATEGORY_COLORS: Record<string, string> = {
    GERAL: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    FINANCEIRO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    OPERACIONAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    COMERCIAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    PENDENCIA: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    ALERTA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const CATEGORY_LABELS: Record<string, string> = {
    GERAL: 'Geral',
    FINANCEIRO: 'Financeiro',
    OPERACIONAL: 'Operacional',
    COMERCIAL: 'Comercial',
    PENDENCIA: 'Pendencia',
    ALERTA: 'Alerta',
};

const ACTION_LABELS: Record<string, string> = {
    UPDATE: 'Dados atualizados',
    STATUS_CHANGE: 'Status alterado',
    CREATED: 'Cadastro criado',
};

const FIELD_LABELS: Record<string, string> = {
    tradeName: 'Nome Fantasia',
    legalName: 'Razao Social',
    document: 'Documento',
    status: 'Status',
    phone: 'Telefone',
    email: 'Email',
    city: 'Cidade',
    state: 'Estado',
    street: 'Rua',
    number: 'Numero',
    complement: 'Complemento',
    neighborhood: 'Bairro',
    zipCode: 'CEP',
    logoUrl: 'Logo',
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} as ${hours}:${minutes}`;
}

export default function CompanyHistoryPanel({ companyId }: Props) {
    const [activeTab, setActiveTab] = useState<'notes' | 'audit'>('notes');

    return (
        <div>
            {/* Tab buttons */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'notes'
                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Notas Internas
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'audit'
                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Alteracoes Cadastrais
                </button>
            </div>

            {activeTab === 'notes' ? (
                <NotesTab companyId={companyId} />
            ) : (
                <AuditLogTab companyId={companyId} />
            )}
        </div>
    );
}

// ============================================================
// Notes Tab
// ============================================================

function NotesTab({ companyId }: { companyId: string }) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<NoteCategory>('GERAL');
    const [files, setFiles] = useState<File[]>([]);

    // Filter state
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch notes
    const { data: notesData, isLoading } = useQuery({
        queryKey: ['company-notes', companyId, { page, category: filterCategory, search: debouncedSearch }],
        queryFn: async () => {
            const params: Record<string, unknown> = { page, limit };
            if (filterCategory) params.category = filterCategory;
            if (debouncedSearch) params.search = debouncedSearch;
            const res = await adminService.getCompanyNotes(companyId, params as any);
            return res.data;
        },
    });

    const notes = notesData?.data || notesData?.notes || (Array.isArray(notesData) ? notesData : []);
    const totalNotes = notesData?.total || notesData?.meta?.total || notes.length;
    const totalPages = Math.ceil(totalNotes / limit) || 1;

    // Create note mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('category', category);
            files.forEach((file) => formData.append('attachments', file));
            return adminService.createCompanyNote(companyId, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-notes', companyId] });
            setContent('');
            setCategory('GERAL');
            setFiles([]);
        },
    });

    // Delete note mutation
    const deleteMutation = useMutation({
        mutationFn: (noteId: string) => adminService.deleteCompanyNote(companyId, noteId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-notes', companyId] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        createMutation.mutate();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDelete = (noteId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta nota?')) {
            deleteMutation.mutate(noteId);
        }
    };

    const handleDownload = useCallback(async (noteId: string, attachmentId: string, fileName: string) => {
        try {
            const res = await adminService.downloadNoteAttachment(companyId, noteId, attachmentId);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'attachment';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            // Download failed silently
        }
    }, [companyId]);

    const startIndex = (page - 1) * limit + 1;
    const endIndex = Math.min(page * limit, totalNotes);

    return (
        <div className="space-y-4">
            {/* Create note form */}
            <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] rounded-xl">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Adicionar uma nota..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as NoteCategory)}
                        className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-white"
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Paperclip className="w-4 h-4" />
                        Anexar arquivos
                    </button>

                    <button
                        type="submit"
                        disabled={!content.trim() || createMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
                    >
                        <Plus className="w-4 h-4" />
                        {createMutation.isPending ? 'Salvando...' : 'Adicionar Nota'}
                    </button>
                </div>

                {/* File preview */}
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {files.map((file, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-lg text-xs font-medium text-sky-700 dark:text-sky-400"
                            >
                                <Paperclip className="w-3 h-3" />
                                {file.name}
                                <button
                                    type="button"
                                    onClick={() => removeFile(i)}
                                    className="ml-1 text-sky-500 hover:text-red-500 transition-colors"
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </form>

            {/* Filter bar */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Buscar notas..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => { setFilterCategory(''); setPage(1); }}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            filterCategory === ''
                                ? 'bg-sky-500 text-white'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        Todas
                    </button>
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.value}
                            onClick={() => { setFilterCategory(c.value); setPage(1); }}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                filterCategory === c.value
                                    ? 'bg-sky-500 text-white'
                                    : `${CATEGORY_COLORS[c.value]} hover:opacity-80`
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notes list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : notes.length === 0 ? (
                <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma anotacao registrada.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notes.map((note: any) => (
                        <div
                            key={note.id}
                            className="p-3 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] rounded-xl"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${CATEGORY_COLORS[note.category] || CATEGORY_COLORS.GERAL}`}>
                                            {CATEGORY_LABELS[note.category] || note.category}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{note.content}</p>

                                    {/* Attachments */}
                                    {note.attachments && note.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {note.attachments.map((att: any) => (
                                                <button
                                                    key={att.id}
                                                    onClick={() => handleDownload(note.id, att.id, att.fileName || att.filename)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    {att.fileName || att.filename || 'Anexo'}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-400 mt-2">
                                        por {note.author?.name || note.authorName || 'Sistema'} - {formatDate(note.createdAt)}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleDelete(note.id)}
                                    disabled={deleteMutation.isPending}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                                    title="Excluir nota"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalNotes > 0 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Mostrando {startIndex}-{endIndex} de {totalNotes} notas
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-3 h-3" />
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Proximo
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Audit Log Tab
// ============================================================

function AuditLogTab({ companyId }: { companyId: string }) {
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data: auditData, isLoading } = useQuery({
        queryKey: ['company-audit-log', companyId, { page }],
        queryFn: async () => {
            const res = await adminService.getCompanyAuditLog(companyId, { page, limit });
            return res.data;
        },
    });

    const entries = auditData?.data || auditData?.entries || (Array.isArray(auditData) ? auditData : []);
    const totalEntries = auditData?.total || auditData?.meta?.total || entries.length;
    const totalPages = Math.ceil(totalEntries / limit) || 1;

    const startIndex = (page - 1) * limit + 1;
    const endIndex = Math.min(page * limit, totalEntries);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma alteracao registrada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Timeline */}
            <div className="relative space-y-0">
                {entries.map((entry: any, index: number) => (
                    <div key={entry.id || index} className="relative flex gap-3 pb-4">
                        {/* Timeline line */}
                        {index < entries.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                        )}

                        {/* Timeline dot */}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-sky-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {ACTION_LABELS[entry.action] || entry.action}
                            </p>

                            {/* Changes detail */}
                            {entry.changes && Object.keys(entry.changes).length > 0 && (
                                <div className="mt-1 space-y-1">
                                    {Object.entries(entry.changes).map(([field, change]: [string, any]) => (
                                        <div key={field} className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                {FIELD_LABELS[field] || field}:
                                            </span>{' '}
                                            <span className="text-red-500 line-through">{change.old || change.from || '-'}</span>
                                            {' → '}
                                            <span className="text-green-600 dark:text-green-400">{change.new || change.to || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-gray-400 mt-1">
                                {entry.author?.name || entry.authorName || entry.performedBy?.name || 'Sistema'} - {formatDate(entry.createdAt)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalEntries > 0 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Mostrando {startIndex}-{endIndex} de {totalEntries} registros
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-3 h-3" />
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Proximo
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
