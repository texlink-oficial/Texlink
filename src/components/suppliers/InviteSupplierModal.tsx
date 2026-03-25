import React, { useState, useEffect, useCallback } from 'react';
import {
    X,
    Loader2,
    Building2,
    CheckCircle,
    XCircle,
    Mail,
    MessageCircle,
    User,
    Phone,
    FileText,
    MapPin,
    Send,
    AlertCircle,
} from 'lucide-react';
import { suppliersService, type CNPJValidationResult, type InvitationChannel } from '../../services/suppliers.service';
import { formatCPF, validateCPF } from '../../utils/cpf';

interface InviteSupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormData {
    cnpj: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp: string;
    customMessage: string;
    sendVia: InvitationChannel;
    internalCode: string;
    notes: string;
}

const initialFormData: FormData = {
    cnpj: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactWhatsapp: '',
    customMessage: '',
    sendVia: 'EMAIL',
    internalCode: '',
    notes: '',
};

// CNPJ mask function
const formatCnpj = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 14);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
};

// Phone mask function
const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
};

export const InviteSupplierModal: React.FC<InviteSupplierModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>('CNPJ');
    const [cnpjValidation, setCnpjValidation] = useState<CNPJValidationResult | null>(null);
    const [isValidatingCnpj, setIsValidatingCnpj] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsapp, setSendWhatsapp] = useState(false);

    // Update sendVia based on toggles
    useEffect(() => {
        if (sendEmail && sendWhatsapp) {
            setFormData(prev => ({ ...prev, sendVia: 'BOTH' }));
        } else if (sendWhatsapp) {
            setFormData(prev => ({ ...prev, sendVia: 'WHATSAPP' }));
        } else {
            setFormData(prev => ({ ...prev, sendVia: 'EMAIL' }));
        }
    }, [sendEmail, sendWhatsapp]);

    // Debounced CNPJ validation
    const validateCnpj = useCallback(async (cnpj: string) => {
        const cleaned = cnpj.replace(/\D/g, '');
        if (cleaned.length !== 14) {
            setCnpjValidation(null);
            return;
        }

        setIsValidatingCnpj(true);
        try {
            const result = await suppliersService.validateCnpj(cleaned);
            setCnpjValidation(result);

            // Auto-fill contact fields if available from API
            if (result.isValid && result.data) {
                setFormData(prev => ({
                    ...prev,
                    contactPhone: prev.contactPhone || formatPhone(result.data?.telefone || ''),
                }));
            }
        } catch (err) {
            setCnpjValidation({
                isValid: false,
                error: 'Erro ao validar CNPJ',
                source: 'ERROR',
                timestamp: new Date(),
            });
        } finally {
            setIsValidatingCnpj(false);
        }
    }, []);

    // Validate CNPJ when it changes (with debounce) - skip for CPF
    useEffect(() => {
        if (documentType === 'CPF') {
            setCnpjValidation(null);
            return;
        }
        const cleaned = formData.cnpj.replace(/\D/g, '');
        if (cleaned.length === 14) {
            const timer = setTimeout(() => {
                validateCnpj(formData.cnpj);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setCnpjValidation(null);
        }
    }, [formData.cnpj, validateCnpj, documentType]);

    const handleInputChange = (field: keyof FormData, value: string) => {
        setError(null);
        if (field === 'cnpj') {
            setFormData(prev => ({ ...prev, [field]: documentType === 'CPF' ? formatCPF(value) : formatCnpj(value) }));
        } else if (field === 'contactPhone' || field === 'contactWhatsapp') {
            setFormData(prev => ({ ...prev, [field]: formatPhone(value) }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const validateForm = (): boolean => {
        const docDigits = formData.cnpj.replace(/\D/g, '');
        if (documentType === 'CPF') {
            if (!docDigits || docDigits.length !== 11 || !validateCPF(docDigits)) {
                setError('CPF inválido');
                return false;
            }
        } else {
            if (!docDigits || docDigits.length !== 14) {
                setError('CNPJ inválido');
                return false;
            }
        }
        if (!formData.contactName.trim()) {
            setError('Nome do contato é obrigatório');
            return false;
        }
        if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
            setError('Email inválido');
            return false;
        }
        if (!formData.contactPhone || formData.contactPhone.replace(/\D/g, '').length < 10) {
            setError('Telefone inválido');
            return false;
        }
        if (!sendEmail && !sendWhatsapp) {
            setError('Selecione ao menos um canal de envio');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await suppliersService.inviteSupplier({
                cnpj: formData.cnpj.replace(/\D/g, ''),
                documentType,
                contactName: formData.contactName,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone.replace(/\D/g, ''),
                contactWhatsapp: formData.contactWhatsapp.replace(/\D/g, '') || undefined,
                customMessage: formData.customMessage || undefined,
                sendVia: formData.sendVia,
                internalCode: formData.internalCode || undefined,
                notes: formData.notes || undefined,
            });
            onSuccess();
            handleClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar convite';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData(initialFormData);
        setDocumentType('CNPJ');
        setCnpjValidation(null);
        setError(null);
        setSendEmail(true);
        setSendWhatsapp(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-brand-600 to-brand-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Convidar Nova Facção</h2>
                            <p className="text-sm text-white/80">Envie um convite para uma oficina de costura</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                        {/* Left Column - Form */}
                        <div className="space-y-5">
                            {/* Document Type Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Tipo de Documento
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (documentType !== 'CNPJ') {
                                                setDocumentType('CNPJ');
                                                setFormData(prev => ({ ...prev, cnpj: '' }));
                                                setCnpjValidation(null);
                                            }
                                        }}
                                        className={`p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                            documentType === 'CNPJ'
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                        }`}
                                    >
                                        Pessoa Juridica (CNPJ)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (documentType !== 'CPF') {
                                                setDocumentType('CPF');
                                                setFormData(prev => ({ ...prev, cnpj: '' }));
                                                setCnpjValidation(null);
                                            }
                                        }}
                                        className={`p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                            documentType === 'CPF'
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                        }`}
                                    >
                                        Pessoa Fisica (CPF)
                                    </button>
                                </div>
                            </div>

                            {/* Document Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {documentType} *
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.cnpj}
                                        onChange={(e) => handleInputChange('cnpj', e.target.value)}
                                        placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${cnpjValidation?.isValid === false
                                                ? 'border-red-300 dark:border-red-500'
                                                : cnpjValidation?.isValid
                                                    ? 'border-green-300 dark:border-green-500'
                                                    : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isValidatingCnpj && (
                                            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                                        )}
                                        {!isValidatingCnpj && cnpjValidation?.isValid && (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        )}
                                        {!isValidatingCnpj && cnpjValidation?.isValid === false && (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                </div>
                                {cnpjValidation?.isValid === false && (
                                    <p className="mt-1 text-sm text-red-500">{cnpjValidation.error}</p>
                                )}
                            </div>

                            {/* Contact Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <User className="inline h-4 w-4 mr-1" />
                                    Nome do Contato *
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactName}
                                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                                    placeholder="Nome da pessoa responsável"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <Mail className="inline h-4 w-4 mr-1" />
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                                    placeholder="email@empresa.com.br"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>

                            {/* Phone / WhatsApp Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Phone className="inline h-4 w-4 mr-1" />
                                        Telefone *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.contactPhone}
                                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <MessageCircle className="inline h-4 w-4 mr-1" />
                                        WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.contactWhatsapp}
                                        onChange={(e) => handleInputChange('contactWhatsapp', e.target.value)}
                                        placeholder="Se diferente"
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Internal Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <FileText className="inline h-4 w-4 mr-1" />
                                    Código Interno
                                </label>
                                <input
                                    type="text"
                                    value={formData.internalCode}
                                    onChange={(e) => handleInputChange('internalCode', e.target.value)}
                                    placeholder="Código de referência interno (opcional)"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>

                            {/* Custom Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Mensagem Personalizada
                                </label>
                                <textarea
                                    value={formData.customMessage}
                                    onChange={(e) => handleInputChange('customMessage', e.target.value)}
                                    placeholder="Adicione uma mensagem ao convite (opcional)"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* Send Via Toggles */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Enviar Convite Via
                                </label>
                                <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${sendEmail
                                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={sendEmail}
                                            onChange={(e) => setSendEmail(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <Mail className="h-4 w-4" />
                                        <span className="font-medium">Email</span>
                                    </label>
                                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${sendWhatsapp
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={sendWhatsapp}
                                            onChange={(e) => setSendWhatsapp(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <MessageCircle className="h-4 w-4" />
                                        <span className="font-medium">WhatsApp</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Company Preview */}
                        <div className="space-y-5">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Dados da Empresa
                                </h3>

                                {!cnpjValidation && !isValidatingCnpj && (
                                    <div className="text-center py-8 text-gray-400">
                                        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">
                                            {documentType === 'CPF'
                                                ? 'Para CPF, preencha os dados manualmente'
                                                : 'Digite o CNPJ para visualizar os dados da empresa'}
                                        </p>
                                    </div>
                                )}

                                {isValidatingCnpj && (
                                    <div className="text-center py-8 text-gray-400">
                                        <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
                                        <p className="text-sm">Consultando CNPJ...</p>
                                    </div>
                                )}

                                {cnpjValidation?.isValid === false && (
                                    <div className="text-center py-8 text-red-500">
                                        <XCircle className="h-12 w-12 mx-auto mb-3 opacity-70" />
                                        <p className="text-sm font-medium">{cnpjValidation.error}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Verifique o CNPJ e tente novamente
                                        </p>
                                    </div>
                                )}

                                {cnpjValidation?.isValid && cnpjValidation.data && (
                                    <div className="space-y-4">
                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cnpjValidation.data.situacao === 'ATIVA'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {cnpjValidation.data.situacao === 'ATIVA' ? (
                                                    <CheckCircle className="h-3 w-3" />
                                                ) : (
                                                    <XCircle className="h-3 w-3" />
                                                )}
                                                {cnpjValidation.data.situacao}
                                            </span>
                                        </div>

                                        {/* Company Name */}
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Razão Social</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                                {cnpjValidation.data.razaoSocial}
                                            </p>
                                        </div>

                                        {cnpjValidation.data.nomeFantasia && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nome Fantasia</p>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                                                    {cnpjValidation.data.nomeFantasia}
                                                </p>
                                            </div>
                                        )}

                                        {/* Address */}
                                        {cnpjValidation.data.endereco && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    Endereço
                                                </p>
                                                <p className="text-sm text-gray-700 dark:text-gray-200 mt-0.5">
                                                    {cnpjValidation.data.endereco.logradouro}, {cnpjValidation.data.endereco.numero}
                                                    {cnpjValidation.data.endereco.complemento && ` - ${cnpjValidation.data.endereco.complemento}`}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                                    {cnpjValidation.data.endereco.bairro} - {cnpjValidation.data.endereco.municipio}/{cnpjValidation.data.endereco.uf}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    CEP: {cnpjValidation.data.endereco.cep}
                                                </p>
                                            </div>
                                        )}

                                        {/* Activity */}
                                        {cnpjValidation.data.atividadePrincipal && (
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Atividade Principal</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-200 mt-0.5">
                                                    <span className="text-xs text-gray-400">{cnpjValidation.data.atividadePrincipal.codigo}</span>
                                                    <br />
                                                    {cnpjValidation.data.atividadePrincipal.descricao}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Observações Internas
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    placeholder="Anotações visíveis apenas para sua equipe"
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mx-6 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (!sendEmail && !sendWhatsapp)}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Enviar Convite
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
