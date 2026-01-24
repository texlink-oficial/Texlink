import React, { useState } from 'react';
import { X, FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import { favoritesService, CreateTemplateData } from '../../services/favorites.service';

interface SaveAsTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderData: {
        productType: string;
        productCategory?: string;
        productName: string;
        description?: string;
        materialsProvided: boolean;
        pricePerUnit?: number;
        observations?: string;
    };
    onSaved?: () => void;
}

export const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
    isOpen,
    onClose,
    orderData,
    onSaved,
}) => {
    const [templateName, setTemplateName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!templateName.trim()) {
            setError('Digite um nome para o template');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data: CreateTemplateData = {
                name: templateName.trim(),
                productType: orderData.productType,
                productCategory: orderData.productCategory,
                productName: orderData.productName,
                description: orderData.description,
                materialsProvided: orderData.materialsProvided,
                defaultPrice: orderData.pricePerUnit,
                observations: orderData.observations,
            };

            await favoritesService.createTemplate(data);
            setSuccess(true);
            onSaved?.();

            // Auto close after success
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (err) {
            setError('Erro ao salvar template. Tente novamente.');
            console.error('Error saving template:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setTemplateName('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Salvar como Template</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Reutilize esta configuração</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {success ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Template Salvo!
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Você pode usar este template em novos pedidos.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Template Name Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nome do Template *
                                </label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Ex: Camiseta Básica Algodão"
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Preview */}
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                    Dados que serão salvos
                                </p>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                                        <span className="text-gray-900 dark:text-white font-medium">{orderData.productType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Produto:</span>
                                        <span className="text-gray-900 dark:text-white font-medium">{orderData.productName}</span>
                                    </div>
                                    {orderData.pricePerUnit && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Preço:</span>
                                            <span className="text-gray-900 dark:text-white font-medium">
                                                R$ {orderData.pricePerUnit.toFixed(2)}/un
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Materiais:</span>
                                        <span className="text-gray-900 dark:text-white font-medium">
                                            {orderData.materialsProvided ? 'Fornecidos' : 'Pela Facção'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !templateName.trim()}
                                    className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar Template'
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SaveAsTemplateModal;
