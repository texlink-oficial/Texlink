import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import {
    X,
    Upload,
    FileSpreadsheet,
    Download,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowLeft,
    ArrowRight,
    Trash2,
} from 'lucide-react';
import axios from 'axios';
import { suppliersService, type InviteSupplierDto } from '../../services/suppliers.service';

const MAX_FILE_SIZE_MB = 5;
const MAX_ROW_COUNT = 500;

// ==================== Types ====================

interface ParsedRow {
    cnpj: string;
    contato_nome: string;
    contato_email: string;
    contato_telefone: string;
}

interface ValidatedRow extends ParsedRow {
    index: number;
    errors: string[];
    status: 'pending' | 'sending' | 'success' | 'error';
    errorMessage?: string;
}

type ModalStep = 'upload' | 'preview' | 'sending';

interface BulkImportSuppliersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete?: (results: { success: number; errors: number }) => void;
}

// ==================== Helpers ====================

const cleanCnpj = (value: string): string => value.replace(/\D/g, '');

const cleanPhone = (value: string): string => value.replace(/\D/g, '');

const isValidCnpj = (cnpj: string): boolean => {
    const cleaned = cleanCnpj(cnpj);
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;

    // Validate check digits
    let sum = 0;
    let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 12; i++) sum += parseInt(cleaned[i]) * weight[i];
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cleaned[12]) !== digit1) return false;

    sum = 0;
    weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 13; i++) sum += parseInt(cleaned[i]) * weight[i];
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cleaned[13]) !== digit2) return false;

    return true;
};

const isValidEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone: string): boolean => {
    const cleaned = cleanPhone(phone);
    return cleaned.length >= 10 && cleaned.length <= 11;
};

const validateRow = (row: ParsedRow, index: number, seenCnpjs: Set<string>): ValidatedRow => {
    const errors: string[] = [];

    if (!row.cnpj?.trim()) {
        errors.push('CNPJ obrigatório');
    } else if (!isValidCnpj(row.cnpj)) {
        errors.push('CNPJ inválido');
    } else {
        const cleaned = cleanCnpj(row.cnpj);
        if (seenCnpjs.has(cleaned)) {
            errors.push('CNPJ duplicado na planilha');
        } else {
            seenCnpjs.add(cleaned);
        }
    }

    if (!row.contato_nome?.trim()) {
        errors.push('Nome obrigatório');
    }

    if (!row.contato_email?.trim()) {
        errors.push('Email obrigatório');
    } else if (!isValidEmail(row.contato_email.trim())) {
        errors.push('Email inválido');
    }

    if (!row.contato_telefone?.trim()) {
        errors.push('Telefone obrigatório');
    } else if (!isValidPhone(row.contato_telefone)) {
        errors.push('Telefone inválido');
    }

    return {
        ...row,
        index,
        errors,
        status: 'pending',
    };
};

const generateTemplateCsv = (): string => {
    const header = 'cnpj,contato_nome,contato_email,contato_telefone';
    const example = '11.222.333/0001-81,Maria Silva,maria@faccao.com,(11) 99999-0000';
    return `${header}\n${example}`;
};

// ==================== Component ====================

const BulkImportSuppliersModal: React.FC<BulkImportSuppliersModalProps> = ({
    isOpen,
    onClose,
    onComplete,
}) => {
    const [step, setStep] = useState<ModalStep>('upload');
    const [rows, setRows] = useState<ValidatedRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [parseError, setParseError] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    const reset = () => {
        setStep('upload');
        setRows([]);
        setFileName('');
        setParseError('');
        setIsDragOver(false);
        setSendProgress({ current: 0, total: 0 });
        setIsSending(false);
        abortRef.current = false;
    };

    const handleClose = () => {
        if (isSending) {
            abortRef.current = true;
            return;
        }
        reset();
        onClose();
    };

    const processFile = useCallback((file: File) => {
        setParseError('');
        setFileName(file.name);

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!['csv', 'txt'].includes(extension || '')) {
            setParseError('Formato não suportado. Use arquivo CSV (.csv)');
            return;
        }

        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setParseError(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_MB}MB`);
            return;
        }

        Papa.parse<ParsedRow>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) =>
                header.trim().toLowerCase().replace(/\s+/g, '_'),
            complete: (results) => {
                if (results.errors.length > 0 && results.data.length === 0) {
                    setParseError(
                        `Erro ao ler arquivo: ${results.errors[0].message}`
                    );
                    return;
                }

                if (results.data.length === 0) {
                    setParseError('Arquivo vazio ou sem dados válidos');
                    return;
                }

                if (results.data.length > MAX_ROW_COUNT) {
                    setParseError(
                        `Arquivo contém ${results.data.length} linhas. Máximo permitido: ${MAX_ROW_COUNT}`
                    );
                    return;
                }

                // Check required columns
                const fields = results.meta.fields || [];
                const requiredCols = ['cnpj', 'contato_nome', 'contato_email', 'contato_telefone'];
                const missingCols = requiredCols.filter(
                    (col) => !fields.includes(col)
                );

                if (missingCols.length > 0) {
                    setParseError(
                        `Colunas obrigatórias não encontradas: ${missingCols.join(', ')}`
                    );
                    return;
                }

                const seenCnpjs = new Set<string>();
                const validated = results.data.map((row, i) =>
                    validateRow(row, i + 1, seenCnpjs)
                );
                setRows(validated);
                setStep('preview');
            },
            error: (error: Error) => {
                setParseError(`Erro ao processar arquivo: ${error.message}`);
            },
        });
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDownloadTemplate = () => {
        const csv = generateTemplateCsv();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo-importacao-faccoes.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const removeRow = (index: number) => {
        setRows((prev) => prev.filter((r) => r.index !== index));
    };

    const validRows = rows.filter((r) => r.errors.length === 0);
    const invalidRows = rows.filter((r) => r.errors.length > 0);

    const handleSend = async () => {
        const toSend = rows.filter((r) => r.errors.length === 0);
        if (toSend.length === 0) return;

        setStep('sending');
        setIsSending(true);
        abortRef.current = false;

        // Mark invalid rows as error upfront (immutable)
        setRows((prev) =>
            prev.map((r) =>
                r.errors.length > 0
                    ? { ...r, status: 'error' as const, errorMessage: 'Validação falhou' }
                    : r
            )
        );

        const total = toSend.length;
        setSendProgress({ current: 0, total });

        let successCount = 0;
        let errorCount = 0;
        let processed = 0;

        for (const row of toSend) {
            if (abortRef.current) break;

            // Mark as sending (immutable update)
            setRows((prev) =>
                prev.map((r) =>
                    r.index === row.index ? { ...r, status: 'sending' as const } : r
                )
            );

            try {
                const dto: InviteSupplierDto = {
                    cnpj: cleanCnpj(row.cnpj),
                    contactName: row.contato_nome.trim(),
                    contactEmail: row.contato_email.trim(),
                    contactPhone: cleanPhone(row.contato_telefone),
                    sendVia: 'EMAIL',
                };

                await suppliersService.inviteSupplier(dto);

                setRows((prev) =>
                    prev.map((r) =>
                        r.index === row.index ? { ...r, status: 'success' as const } : r
                    )
                );
                successCount++;
            } catch (error: unknown) {
                const message =
                    axios.isAxiosError(error)
                        ? error.response?.data?.message || 'Erro ao enviar convite'
                        : 'Erro ao enviar convite';

                setRows((prev) =>
                    prev.map((r) =>
                        r.index === row.index
                            ? { ...r, status: 'error' as const, errorMessage: message }
                            : r
                    )
                );
                errorCount++;
            }

            processed++;
            setSendProgress({ current: processed, total });
        }

        setIsSending(false);
        onComplete?.({ success: successCount, errors: errorCount });
    };

    const successCount = rows.filter((r) => r.status === 'success').length;
    const errorSendCount = rows.filter(
        (r) => r.status === 'error' && r.errorMessage
    ).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        {step !== 'upload' && (
                            <button
                                onClick={() =>
                                    step === 'preview' ? reset() : undefined
                                }
                                disabled={isSending}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Importar Facções em Massa
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {step === 'upload' && 'Faça upload de um arquivo CSV com os dados das facções'}
                                {step === 'preview' && `${rows.length} registros encontrados - ${validRows.length} válidos`}
                                {step === 'sending' && `Enviando convites... ${sendProgress.current}/${sendProgress.total}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* ===== UPLOAD STEP ===== */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Drop Zone */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                                    isDragOver
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                                }`}
                            >
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                    Arraste o arquivo CSV aqui
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    ou clique para selecionar
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Formatos aceitos: .csv
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {/* Parse Error */}
                            {parseError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            {parseError}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Template Download */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                                            Modelo de planilha
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                                            Baixe o modelo CSV com as colunas obrigatórias:
                                            <strong> cnpj</strong>,
                                            <strong> contato_nome</strong>,
                                            <strong> contato_email</strong>,
                                            <strong> contato_telefone</strong>
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadTemplate();
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Baixar Modelo CSV
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== PREVIEW STEP ===== */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Summary Bar */}
                            <div className="flex items-center gap-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    {validRows.length} válidos
                                </span>
                                {invalidRows.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium">
                                        <XCircle className="w-4 h-4" />
                                        {invalidRows.length} com erros
                                    </span>
                                )}
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                                    Arquivo: {fileName}
                                </span>
                            </div>

                            {/* Table */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900">
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-10">
                                                    #
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                                    CNPJ
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                                    Nome
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                                    Email
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                                    Telefone
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-12">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 w-10" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {rows.map((row) => (
                                                <tr
                                                    key={row.index}
                                                    className={
                                                        row.errors.length > 0
                                                            ? 'bg-red-50/50 dark:bg-red-900/10'
                                                            : ''
                                                    }
                                                >
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {row.index}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">
                                                        {row.cnpj || (
                                                            <span className="text-red-400 italic">
                                                                vazio
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                        {row.contato_nome || (
                                                            <span className="text-red-400 italic">
                                                                vazio
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                        {row.contato_email || (
                                                            <span className="text-red-400 italic">
                                                                vazio
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                        {row.contato_telefone || (
                                                            <span className="text-red-400 italic">
                                                                vazio
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {row.errors.length > 0 ? (
                                                            <div className="group relative">
                                                                <XCircle className="w-5 h-5 text-red-500" />
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                                                        {row.errors.join(', ')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() =>
                                                                removeRow(
                                                                    row.index
                                                                )
                                                            }
                                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                            title="Remover linha"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {rows.length === 0 && (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Todas as linhas foram removidas.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== SENDING STEP ===== */}
                    {step === 'sending' && (
                        <div className="space-y-6">
                            {/* Progress Bar */}
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                        Progresso
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {sendProgress.current} / {sendProgress.total}
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${
                                                sendProgress.total > 0
                                                    ? (sendProgress.current / sendProgress.total) * 100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Results Summary */}
                            {!isSending && sendProgress.current > 0 && (
                                <div className="flex items-center gap-4">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                                        <CheckCircle className="w-4 h-4" />
                                        {successCount} enviados
                                    </span>
                                    {errorSendCount > 0 && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium">
                                            <XCircle className="w-4 h-4" />
                                            {errorSendCount} com erro
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Result Table */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0">
                                            <tr className="bg-gray-50 dark:bg-gray-900">
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-10">
                                                    #
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                                    CNPJ
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                                    Nome
                                                </th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                                                    Resultado
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {rows.map((row) => (
                                                <tr key={row.index}>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {row.index}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">
                                                        {row.cnpj}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                        {row.contato_nome}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {row.status === 'pending' && (
                                                            <span className="text-gray-400">
                                                                Aguardando...
                                                            </span>
                                                        )}
                                                        {row.status === 'sending' && (
                                                            <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Enviando...
                                                            </span>
                                                        )}
                                                        {row.status === 'success' && (
                                                            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                                <CheckCircle className="w-4 h-4" />
                                                                Convite enviado
                                                            </span>
                                                        )}
                                                        {row.status === 'error' && (
                                                            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                                                <XCircle className="w-4 h-4" />
                                                                {row.errorMessage}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                        {step === 'sending' && !isSending ? 'Fechar' : 'Cancelar'}
                    </button>

                    {step === 'preview' && (
                        <button
                            onClick={handleSend}
                            disabled={validRows.length === 0}
                            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowRight className="w-5 h-5" />
                            Enviar {validRows.length} Convites
                        </button>
                    )}

                    {step === 'sending' && isSending && (
                        <button
                            onClick={() => {
                                abortRef.current = true;
                            }}
                            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                        >
                            Cancelar Envio
                        </button>
                    )}

                    {step === 'sending' && !isSending && (
                        <div className="flex items-center gap-3">
                            {errorSendCount > 0 && (
                                <button
                                    onClick={reset}
                                    className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    Nova Importação
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkImportSuppliersModal;
