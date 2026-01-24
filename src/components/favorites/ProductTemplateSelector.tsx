import React, { useState, useEffect } from 'react';
import { ChevronDown, FileText, Check, Loader2, Package } from 'lucide-react';
import { favoritesService, ProductTemplate } from '../../services/favorites.service';

interface ProductTemplateSelectorProps {
    onSelect: (template: ProductTemplate) => void;
    className?: string;
}

export const ProductTemplateSelector: React.FC<ProductTemplateSelectorProps> = ({
    onSelect,
    className = '',
}) => {
    const [templates, setTemplates] = useState<ProductTemplate[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const data = await favoritesService.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (template: ProductTemplate) => {
        setSelectedId(template.id);
        onSelect(template);
        setIsOpen(false);
    };

    if (templates.length === 0 && !isLoading) {
        return null;
    }

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-800 rounded-xl text-brand-700 dark:text-brand-300 text-sm font-medium transition-all"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <FileText className="w-4 h-4" />
                )}
                <span>Usar Template</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-80 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Templates Salvos
                            </p>
                        </div>

                        <div className="py-1">
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => handleSelect(template)}
                                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors ${selectedId === template.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                        <Package className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {template.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                            {template.productType} • {template.productName}
                                        </p>
                                        {template.defaultPrice && (
                                            <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
                                                R$ {template.defaultPrice.toFixed(2)}/un
                                            </p>
                                        )}
                                    </div>
                                    {selectedId === template.id && (
                                        <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductTemplateSelector;
