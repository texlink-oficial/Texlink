import React, { useState, useEffect } from 'react';
import { X, Eye, HelpCircle, AlertCircle } from 'lucide-react';
import type {
    InvitationTemplate,
    InvitationType,
    CreateInvitationTemplateDto,
} from '../../types/invitation-templates';
import {
    TEMPLATE_VARIABLES,
    replaceTemplateVariables,
    validateTemplateVariables,
} from '../../types/invitation-templates';

interface CreateEditTemplateModalProps {
    template?: InvitationTemplate;
    onClose: () => void;
    onSuccess: (template: InvitationTemplate) => void;
    onSubmit: (data: CreateInvitationTemplateDto) => Promise<InvitationTemplate>;
}

export const CreateEditTemplateModal: React.FC<CreateEditTemplateModalProps> = ({
    template,
    onClose,
    onSuccess,
    onSubmit,
}) => {
    const isEditing = !!template;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [name, setName] = useState(template?.name || '');
    const [type, setType] = useState<InvitationType>(template?.type || 'EMAIL');
    const [subject, setSubject] = useState(template?.subject || '');
    const [content, setContent] = useState(template?.content || '');

    // Preview variables (exemplo)
    const previewVariables = {
        brand_name: 'Texlink',
        contact_name: 'João Silva',
        company_name: 'Confecções Silva LTDA',
        link: 'https://texlink.com.br/onboarding/abc123',
        cnpj: '12.345.678/0001-90',
    };

    useEffect(() => {
        // Limpa subject se tipo não for EMAIL
        if (type !== 'EMAIL') {
            setSubject('');
        }
    }, [type]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Nome
        if (!name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        } else if (name.length < 2 || name.length > 100) {
            newErrors.name = 'Nome deve ter entre 2 e 100 caracteres';
        }

        // Subject (obrigatório para EMAIL)
        if (type === 'EMAIL') {
            if (!subject.trim()) {
                newErrors.subject = 'Assunto é obrigatório para templates de EMAIL';
            } else if (subject.length > 200) {
                newErrors.subject = 'Assunto deve ter no máximo 200 caracteres';
            }
        }

        // Content
        if (!content.trim()) {
            newErrors.content = 'Conteúdo é obrigatório';
        } else if (content.length < 10 || content.length > 5000) {
            newErrors.content = 'Conteúdo deve ter entre 10 e 5000 caracteres';
        }

        // Valida variáveis
        const validation = validateTemplateVariables(content);
        if (!validation.isValid) {
            newErrors.content = `Variáveis inválidas: ${validation.invalidVariables.join(', ')}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            setIsSubmitting(true);

            const data: CreateInvitationTemplateDto = {
                name: name.trim(),
                type,
                subject: type === 'EMAIL' ? subject.trim() : undefined,
                content: content.trim(),
            };

            const result = await onSubmit(data);
            onSuccess(result);
            onClose();
        } catch (error: any) {
            setErrors({ submit: error.message || 'Erro ao salvar template' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const insertVariable = (variable: string) => {
        const placeholder = `{{${variable}}}`;
        setContent(prev => prev + placeholder);
    };

    const previewContent = replaceTemplateVariables(content, previewVariables);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isEditing ? 'Editar Template' : 'Novo Template'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {isEditing
                                ? 'Modifique os campos do template'
                                : 'Crie um novo template de convite personalizado'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Form Fields */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nome do Template *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Convite Personalizado"
                                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white ${
                                        errors.name
                                            ? 'border-red-500'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                    maxLength={100}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* Tipo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de Convite *
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as InvitationType)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                                >
                                    <option value="EMAIL">Email</option>
                                    <option value="WHATSAPP">WhatsApp</option>
                                    <option value="SMS">SMS</option>
                                    <option value="LINK">Link Direto</option>
                                </select>
                            </div>

                            {/* Subject (apenas para EMAIL) */}
                            {type === 'EMAIL' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Assunto do Email *
                                    </label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Ex: Convite para Parceria - {{brand_name}}"
                                        className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white ${
                                            errors.subject
                                                ? 'border-red-500'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                        maxLength={200}
                                    />
                                    {errors.subject && (
                                        <p className="text-sm text-red-500 mt-1">{errors.subject}</p>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Conteúdo do Template *
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Escreva o conteúdo do template aqui. Use {{variáveis}} para personalizar."
                                    rows={12}
                                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white font-mono text-sm resize-none ${
                                        errors.content
                                            ? 'border-red-500'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                    maxLength={5000}
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        {errors.content && (
                                            <p className="text-sm text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {errors.content}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {content.length} / 5000 caracteres
                                    </p>
                                </div>
                            </div>

                            {/* Preview Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                            >
                                <Eye className="w-4 h-4" />
                                {showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
                            </button>

                            {/* Preview */}
                            {showPreview && (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        Preview com Variáveis Substituídas:
                                    </p>
                                    {type === 'EMAIL' && subject && (
                                        <div className="mb-3">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                Assunto:
                                            </p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {replaceTemplateVariables(subject, previewVariables)}
                                            </p>
                                        </div>
                                    )}
                                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {previewContent}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Variables */}
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex items-start gap-2 mb-3">
                                    <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                                            Variáveis Disponíveis
                                        </h4>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                            Clique para inserir no template
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {TEMPLATE_VARIABLES.map((variable) => (
                                        <button
                                            key={variable.key}
                                            type="button"
                                            onClick={() => insertVariable(variable.key)}
                                            className="w-full text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-400 transition-colors group"
                                        >
                                            <code className="text-xs font-mono text-brand-600 dark:text-brand-400 group-hover:text-brand-700 dark:group-hover:text-brand-300">
                                                {`{{${variable.key}}}`}
                                            </code>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {variable.description}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-2">
                                    ⚠️ Importante
                                </h4>
                                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                    <li>• Use apenas variáveis listadas acima</li>
                                    <li>• Sempre inclua a variável {`{{link}}`}</li>
                                    <li>• Templates padrão não podem ser editados</li>
                                    <li>• Teste seu template antes de usar</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {errors.submit && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>{isEditing ? 'Salvar Alterações' : 'Criar Template'}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
