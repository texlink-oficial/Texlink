import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    X,
    Send,
    Mail,
    MessageCircle,
    Loader2,
    Eye,
    Settings,
    Copy,
    Check,
    Building2,
} from 'lucide-react';
import type { SupplierCredential, InvitationChannel } from '../../types/credentials';

interface SendInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    credential: SupplierCredential | null;
    onConfirm: (data: InviteFormData) => Promise<void>;
}

interface InviteFormData {
    channel: InvitationChannel;
    templateId?: string;
    customMessage?: string;
}

// Mock templates - in real app, fetch from API
const MOCK_TEMPLATES = [
    {
        id: 'default-welcome',
        name: 'Convite Padrão',
        description: 'Template padrão de boas-vindas',
        channel: 'ALL' as const,
        subject: 'Convite para Credenciamento - {{companyName}}',
        body: `Olá {{contactName}},

A {{brandName}} gostaria de credenciar sua empresa como fornecedora!

Para iniciar o processo, acesse o link abaixo e complete seu cadastro:
{{inviteLink}}

Este link é válido por 7 dias.

Atenciosamente,
Equipe {{brandName}}`,
    },
    {
        id: 'urgent-invite',
        name: 'Convite Urgente',
        description: 'Para convites com prazo curto',
        channel: 'ALL' as const,
        subject: 'URGENTE: Convite para Credenciamento - {{companyName}}',
        body: `Olá {{contactName}},

Temos uma oportunidade urgente para sua empresa!

Acesse agora: {{inviteLink}}

Prazo: 3 dias

Atenciosamente,
{{brandName}}`,
    },
];

export const SendInviteModal: React.FC<SendInviteModalProps> = ({
    isOpen,
    onClose,
    credential,
    onConfirm,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<typeof MOCK_TEMPLATES[0] | null>(
        MOCK_TEMPLATES[0]
    );
    const [linkCopied, setLinkCopied] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
        reset,
    } = useForm<InviteFormData>({
        defaultValues: {
            channel: 'BOTH',
            templateId: 'default-welcome',
        },
    });

    const selectedChannel = watch('channel');
    const customMessage = watch('customMessage');
    const templateId = watch('templateId');

    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            setError(null);
            setSelectedTemplate(MOCK_TEMPLATES[0]);
            onClose();
        }
    };

    const onSubmit = async (data: InviteFormData) => {
        try {
            setIsSubmitting(true);
            setError(null);
            await onConfirm(data);
            reset();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao enviar convite');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        }
        return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    };

    const generateInviteLink = () => {
        const token = 'abc123def456'; // Mock token
        return `https://app.texlink.com/onboarding/${token}`;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generateInviteLink());
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const replaceTemplateVariables = (text: string) => {
        if (!credential) return text;
        return text
            .replace('{{contactName}}', credential.contactName)
            .replace('{{companyName}}', credential.tradeName || credential.legalName || 'Sua empresa')
            .replace('{{brandName}}', 'TexLink') // Should come from context
            .replace('{{inviteLink}}', generateInviteLink());
    };

    const getPreviewMessage = () => {
        if (!selectedTemplate) return '';

        let message = replaceTemplateVariables(selectedTemplate.body);

        if (customMessage && customMessage.trim()) {
            message = `${customMessage.trim()}\n\n---\n\n${message}`;
        }

        return message;
    };

    if (!isOpen || !credential) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-brand-500 to-brand-600 p-6 border-b border-brand-700">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <Send className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">
                                    Enviar Convite de Credenciamento
                                </h2>
                                <p className="text-sm text-brand-100">
                                    Configure e envie o convite para o fornecedor
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* Supplier Info */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {credential.tradeName || credential.legalName || credential.contactName}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {credential.contactName}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Choose Channel */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            1. Escolher Canal de Envio
                        </h3>
                        <div className="space-y-2">
                            {/* Email Option */}
                            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 transition-colors cursor-pointer">
                                <input
                                    type="radio"
                                    value="EMAIL"
                                    {...register('channel', { required: true })}
                                    className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                                />
                                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">Email</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {credential.contactEmail}
                                    </p>
                                </div>
                            </label>

                            {/* WhatsApp Option */}
                            {credential.contactWhatsapp && (
                                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 transition-colors cursor-pointer">
                                    <input
                                        type="radio"
                                        value="WHATSAPP"
                                        {...register('channel', { required: true })}
                                        className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                                    />
                                    <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">WhatsApp</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {formatPhone(credential.contactWhatsapp)}
                                        </p>
                                    </div>
                                </label>
                            )}

                            {/* Both Option */}
                            {credential.contactWhatsapp && (
                                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 transition-colors cursor-pointer">
                                    <input
                                        type="radio"
                                        value="BOTH"
                                        {...register('channel', { required: true })}
                                        className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                                    />
                                    <div className="flex gap-1">
                                        <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">Ambos</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Enviar por email e WhatsApp
                                        </p>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Choose Template */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                2. Escolher Template
                            </h3>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                Gerenciar Templates
                            </button>
                        </div>
                        <select
                            {...register('templateId')}
                            onChange={(e) => {
                                const template = MOCK_TEMPLATES.find(t => t.id === e.target.value);
                                setSelectedTemplate(template || null);
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900 dark:text-white"
                        >
                            {MOCK_TEMPLATES.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.name} - {template.description}
                                </option>
                            ))}
                        </select>

                        {/* Template Preview */}
                        {selectedTemplate && (
                            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye className="w-4 h-4 text-gray-500" />
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Preview do Template
                                    </p>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                                    {replaceTemplateVariables(selectedTemplate.subject)}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                    {replaceTemplateVariables(selectedTemplate.body)}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Custom Message */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            3. Mensagem Personalizada (Opcional)
                        </h3>
                        <textarea
                            {...register('customMessage', {
                                maxLength: {
                                    value: 500,
                                    message: 'Máximo de 500 caracteres',
                                },
                            })}
                            rows={3}
                            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-400"
                            placeholder="Adicione uma nota pessoal ao convite (opcional)..."
                            disabled={isSubmitting}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Esta mensagem será exibida antes do template
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {customMessage?.length || 0}/500
                            </p>
                        </div>
                        {errors.customMessage && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {errors.customMessage.message}
                            </p>
                        )}
                    </div>

                    {/* Section 4: Final Preview */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            4. Preview Final
                        </h3>
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Link do Convite:
                            </p>
                            <div className="flex items-center gap-2 mb-3">
                                <input
                                    type="text"
                                    value={generateInviteLink()}
                                    readOnly
                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {linkCopied ? (
                                        <Check className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    )}
                                </button>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    Mensagem que será enviada:
                                </p>
                                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                                    {getPreviewMessage()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
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

export default SendInviteModal;
