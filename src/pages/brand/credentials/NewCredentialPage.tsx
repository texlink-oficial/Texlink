import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, Loader2 } from 'lucide-react';
import { credentialsService } from '../../../services';
import type { CreateCredentialDto, CredentialCategory } from '../../../types/credentials';
import { formatCPF, validateCPF } from '../../../utils/cpf';

const NewCredentialPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>('CNPJ');
    const [formData, setFormData] = useState<CreateCredentialDto>({
        cnpj: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        contactWhatsapp: '',
        category: undefined,
        notes: '',
        status: 'DRAFT',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const applyCNPJMask = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 14) {
            return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        }
        return value;
    };

    const applyPhoneMask = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 11) {
            if (cleaned.length <= 10) {
                return cleaned.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
            }
            return cleaned.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3');
        }
        return value;
    };

    const handleChange = (field: keyof CreateCredentialDto, value: any) => {
        let processedValue = value;

        if (field === 'cnpj') {
            processedValue = documentType === 'CPF' ? formatCPF(value) : applyCNPJMask(value);
        } else if (field === 'contactPhone' || field === 'contactWhatsapp') {
            processedValue = applyPhoneMask(value);
        }

        setFormData((prev) => ({
            ...prev,
            [field]: processedValue,
        }));

        // Clear error for this field
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Document validation (CNPJ or CPF)
        const cnpjDigits = formData.cnpj.replace(/\D/g, '');
        if (!cnpjDigits) {
            newErrors.cnpj = `${documentType} é obrigatório`;
        } else if (documentType === 'CPF') {
            if (cnpjDigits.length !== 11) {
                newErrors.cnpj = 'CPF deve ter 11 dígitos';
            } else if (!validateCPF(cnpjDigits)) {
                newErrors.cnpj = 'CPF inválido';
            }
        } else if (cnpjDigits.length !== 14) {
            newErrors.cnpj = 'CNPJ deve ter 14 dígitos';
        }

        // Contact name validation
        if (!formData.contactName.trim()) {
            newErrors.contactName = 'Nome do contato é obrigatório';
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.contactEmail) {
            newErrors.contactEmail = 'Email é obrigatório';
        } else if (!emailRegex.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Email inválido';
        }

        // Phone validation
        const phoneDigits = formData.contactPhone.replace(/\D/g, '');
        if (!phoneDigits) {
            newErrors.contactPhone = 'Telefone é obrigatório';
        } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            newErrors.contactPhone = 'Telefone inválido';
        }

        // WhatsApp validation (optional)
        if (formData.contactWhatsapp) {
            const whatsappDigits = formData.contactWhatsapp.replace(/\D/g, '');
            if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
                newErrors.contactWhatsapp = 'WhatsApp inválido';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (shouldValidate: boolean = false) => {
        if (!validateForm()) {
            return;
        }

        try {
            setIsLoading(true);
            setErrorMessage('');

            const submitData: CreateCredentialDto = {
                ...formData,
                documentType,
                status: shouldValidate ? 'PENDING_VALIDATION' : 'DRAFT',
            };

            const credential = await credentialsService.create(submitData);

            setShowSuccessToast(true);
            setTimeout(() => {
                if (shouldValidate) {
                    navigate(`/brand/credenciamento/${credential.id}`);
                } else {
                    navigate('/brand/credenciamento');
                }
            }, 1500);
        } catch (error: any) {
            console.error('Error creating credential:', error);
            setErrorMessage(error.response?.data?.message || 'Erro ao criar credenciamento');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/brand/credenciamento')}
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Voltar
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Novo Credenciamento
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Preencha os dados da facção para iniciar o processo de credenciamento
                </p>
            </div>

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Credenciamento criado com sucesso!</span>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
                    {errorMessage}
                </div>
            )}

            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="space-y-6">
                    {/* Document Type Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo de Documento
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (documentType !== 'CNPJ') {
                                        setDocumentType('CNPJ');
                                        setFormData(prev => ({ ...prev, cnpj: '' }));
                                        setErrors(prev => { const n = { ...prev }; delete n.cnpj; return n; });
                                    }
                                }}
                                className={`p-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                                    documentType === 'CNPJ'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
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
                                        setErrors(prev => { const n = { ...prev }; delete n.cnpj; return n; });
                                    }
                                }}
                                className={`p-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                                    documentType === 'CPF'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                }`}
                            >
                                Pessoa Fisica (CPF)
                            </button>
                        </div>
                    </div>

                    {/* Document (CNPJ/CPF) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {documentType} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.cnpj}
                            onChange={(e) => handleChange('cnpj', e.target.value)}
                            placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                            maxLength={documentType === 'CPF' ? 14 : 18}
                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border ${
                                errors.cnpj
                                    ? 'border-red-500'
                                    : 'border-gray-200 dark:border-gray-700'
                            } rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500`}
                        />
                        {errors.cnpj && (
                            <p className="text-sm text-red-500 mt-1">{errors.cnpj}</p>
                        )}
                    </div>

                    {/* Contact Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nome do Contato / Razão Social <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.contactName}
                            onChange={(e) => handleChange('contactName', e.target.value)}
                            placeholder="Nome completo ou razão social"
                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border ${
                                errors.contactName
                                    ? 'border-red-500'
                                    : 'border-gray-200 dark:border-gray-700'
                            } rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500`}
                        />
                        {errors.contactName && (
                            <p className="text-sm text-red-500 mt-1">{errors.contactName}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={formData.contactEmail}
                            onChange={(e) => handleChange('contactEmail', e.target.value)}
                            placeholder="email@exemplo.com"
                            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border ${
                                errors.contactEmail
                                    ? 'border-red-500'
                                    : 'border-gray-200 dark:border-gray-700'
                            } rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500`}
                        />
                        {errors.contactEmail && (
                            <p className="text-sm text-red-500 mt-1">{errors.contactEmail}</p>
                        )}
                    </div>

                    {/* Phone and WhatsApp */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Telefone <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.contactPhone}
                                onChange={(e) => handleChange('contactPhone', e.target.value)}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border ${
                                    errors.contactPhone
                                        ? 'border-red-500'
                                        : 'border-gray-200 dark:border-gray-700'
                                } rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500`}
                            />
                            {errors.contactPhone && (
                                <p className="text-sm text-red-500 mt-1">{errors.contactPhone}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                WhatsApp <span className="text-gray-400">(opcional)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.contactWhatsapp}
                                onChange={(e) => handleChange('contactWhatsapp', e.target.value)}
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border ${
                                    errors.contactWhatsapp
                                        ? 'border-red-500'
                                        : 'border-gray-200 dark:border-gray-700'
                                } rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500`}
                            />
                            {errors.contactWhatsapp && (
                                <p className="text-sm text-red-500 mt-1">{errors.contactWhatsapp}</p>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Categoria
                        </label>
                        <select
                            value={formData.category || ''}
                            onChange={(e) =>
                                handleChange('category', e.target.value as CredentialCategory)
                            }
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Selecione uma categoria</option>
                            <option value="CONFECCAO">Confecção</option>
                            <option value="BORDADO">Bordado</option>
                            <option value="ESTAMPARIA">Estamparia</option>
                            <option value="LAVANDERIA">Lavanderia</option>
                            <option value="MALHARIA">Malharia</option>
                            <option value="COSTURA">Costura</option>
                            <option value="OUTRO">Outro</option>
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Observações
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Informações adicionais sobre o fornecedor..."
                            rows={4}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => navigate('/brand/credenciamento')}
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <div className="flex-1 flex gap-3">
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={isLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Salvar Rascunho
                        </button>
                        <button
                            onClick={() => handleSubmit(true)}
                            disabled={isLoading}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <CheckCircle className="w-5 h-5" />
                            )}
                            Salvar e Validar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewCredentialPage;
