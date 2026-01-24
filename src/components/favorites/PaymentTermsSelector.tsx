import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, Loader2, CreditCard, Plus } from 'lucide-react';
import { favoritesService, PaymentTermsPreset } from '../../services/favorites.service';

interface PaymentTermsSelectorProps {
    value: string;
    onChange: (terms: string) => void;
    className?: string;
}

export const PaymentTermsSelector: React.FC<PaymentTermsSelectorProps> = ({
    value,
    onChange,
    className = '',
}) => {
    const [presets, setPresets] = useState<PaymentTermsPreset[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadPresets();
    }, []);

    const loadPresets = async () => {
        setIsLoading(true);
        try {
            const data = await favoritesService.getPaymentPresets();
            setPresets(data);
        } catch (error) {
            console.error('Error loading payment presets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (preset: PaymentTermsPreset) => {
        onChange(preset.terms);
        setIsOpen(false);
    };

    // Find if current value matches a preset
    const selectedPreset = presets.find(p => p.terms === value);

    return (
        <div className={`relative ${className}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Condições de Pagamento
            </label>

            <div className="flex gap-2">
                {/* Text Input */}
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Ex: 50% entrada, 50% entrega"
                    className="flex-1 px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all shadow-sm dark:shadow-none"
                />

                {/* Presets Dropdown Button */}
                {presets.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 transition-all"
                        title="Condições salvas"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CreditCard className="w-4 h-4" />
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                )}
            </div>

            {/* Selected Preset Indicator */}
            {selectedPreset && (
                <p className="mt-2 text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Usando: {selectedPreset.name}
                </p>
            )}

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Condições Salvas
                            </p>
                        </div>

                        <div className="py-1 max-h-64 overflow-y-auto">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelect(preset)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors ${preset.terms === value ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {preset.name}
                                            </p>
                                            {preset.isDefault && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
                                                    Padrão
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                            {preset.terms}
                                        </p>
                                    </div>
                                    {preset.terms === value && (
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

export default PaymentTermsSelector;
