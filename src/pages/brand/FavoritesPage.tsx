import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Star, FileText, CreditCard, Trash2, Edit2, Plus, Loader2, Package,
    Factory, ArrowLeft, Check, X, AlertCircle
} from 'lucide-react';
import {
    favoritesService,
    ProductTemplate,
    FavoriteSupplier,
    PaymentTermsPreset
} from '../../services/favorites.service';

type TabType = 'templates' | 'suppliers' | 'payment';

const FavoritesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('templates');
    const [isLoading, setIsLoading] = useState(true);

    // Data states
    const [templates, setTemplates] = useState<ProductTemplate[]>([]);
    const [favoriteSuppliers, setFavoriteSuppliers] = useState<FavoriteSupplier[]>([]);
    const [paymentPresets, setPaymentPresets] = useState<PaymentTermsPreset[]>([]);

    // Modal states
    const [showNewPresetModal, setShowNewPresetModal] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PaymentTermsPreset | null>(null);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetTerms, setNewPresetTerms] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'templates') {
                const data = await favoritesService.getTemplates();
                setTemplates(data);
            } else if (activeTab === 'suppliers') {
                const data = await favoritesService.getFavoriteSuppliers();
                setFavoriteSuppliers(data);
            } else {
                const data = await favoritesService.getPaymentPresets();
                setPaymentPresets(data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este template?')) return;
        try {
            await favoritesService.deleteTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const handleRemoveFavoriteSupplier = async (supplierId: string) => {
        if (!confirm('Tem certeza que deseja remover este fornecedor dos favoritos?')) return;
        try {
            await favoritesService.removeFavoriteSupplier(supplierId);
            setFavoriteSuppliers(prev => prev.filter(f => f.supplierId !== supplierId));
        } catch (error) {
            console.error('Error removing favorite supplier:', error);
        }
    };

    const handleDeletePaymentPreset = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover esta condição de pagamento?')) return;
        try {
            await favoritesService.deletePaymentPreset(id);
            setPaymentPresets(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting payment preset:', error);
        }
    };

    const handleSetDefaultPreset = async (id: string) => {
        try {
            await favoritesService.updatePaymentPreset(id, { isDefault: true });
            setPaymentPresets(prev =>
                prev.map(p => ({ ...p, isDefault: p.id === id }))
            );
        } catch (error) {
            console.error('Error setting default preset:', error);
        }
    };

    const handleSavePreset = async () => {
        if (!newPresetName.trim() || !newPresetTerms.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingPreset) {
                const updated = await favoritesService.updatePaymentPreset(editingPreset.id, {
                    name: newPresetName,
                    terms: newPresetTerms,
                });
                setPaymentPresets(prev =>
                    prev.map(p => (p.id === editingPreset.id ? updated : p))
                );
            } else {
                const created = await favoritesService.createPaymentPreset({
                    name: newPresetName,
                    terms: newPresetTerms,
                });
                setPaymentPresets(prev => [...prev, created]);
            }
            closePresetModal();
        } catch (error) {
            console.error('Error saving preset:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditPreset = (preset: PaymentTermsPreset) => {
        setEditingPreset(preset);
        setNewPresetName(preset.name);
        setNewPresetTerms(preset.terms);
        setShowNewPresetModal(true);
    };

    const closePresetModal = () => {
        setShowNewPresetModal(false);
        setEditingPreset(null);
        setNewPresetName('');
        setNewPresetTerms('');
    };

    const tabs = [
        { id: 'templates' as const, label: 'Templates de Produto', icon: FileText, count: templates.length },
        { id: 'suppliers' as const, label: 'Fornecedores Favoritos', icon: Star, count: favoriteSuppliers.length },
        { id: 'payment' as const, label: 'Condições de Pagamento', icon: CreditCard, count: paymentPresets.length },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/brand/inicio"
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Favoritos e Templates
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Gerencie seus templates, fornecedores favoritos e condições de pagamento
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id
                                    ? 'bg-white/20'
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Templates Tab */}
                        {activeTab === 'templates' && (
                            <div className="space-y-4">
                                {templates.length === 0 ? (
                                    <EmptyState
                                        icon={FileText}
                                        title="Nenhum template salvo"
                                        description="Templates são criados automaticamente quando você salva um pedido como template."
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {templates.map((template) => (
                                            <div
                                                key={template.id}
                                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                                        <Package className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteTemplate(template.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                    {template.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                                    {template.productType} • {template.productName}
                                                </p>
                                                {template.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                                                        {template.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between text-sm">
                                                    {template.defaultPrice && (
                                                        <span className="text-brand-600 dark:text-brand-400 font-medium">
                                                            R$ {template.defaultPrice.toFixed(2)}/un
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-0.5 rounded text-xs ${template.materialsProvided
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                        }`}>
                                                        {template.materialsProvided ? 'Mat. fornecidos' : 'Mat. pela facção'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Suppliers Tab */}
                        {activeTab === 'suppliers' && (
                            <div className="space-y-4">
                                {favoriteSuppliers.length === 0 ? (
                                    <EmptyState
                                        icon={Star}
                                        title="Nenhum fornecedor favorito"
                                        description="Adicione fornecedores aos favoritos na página de busca de facções."
                                        actionLabel="Buscar Facções"
                                        actionLink="/brand/faccoes"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {favoriteSuppliers.map((favorite) => (
                                            <div
                                                key={favorite.id}
                                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                                                    <Factory className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                                                        <Star className="w-3 h-3 text-white fill-current" />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {favorite.supplier.tradeName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center text-xs text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                                            <Star className="w-3 h-3 fill-current mr-1" />
                                                            {favorite.supplier.avgRating?.toFixed(1) || 'N/A'}
                                                        </div>
                                                        {favorite.supplier.city && (
                                                            <span className="text-xs text-gray-500">
                                                                {favorite.supplier.city}, {favorite.supplier.state}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {favorite.notes && (
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {favorite.notes}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFavoriteSupplier(favorite.supplierId)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Payment Presets Tab */}
                        {activeTab === 'payment' && (
                            <div className="space-y-4">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setShowNewPresetModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Nova Condição
                                    </button>
                                </div>

                                {paymentPresets.length === 0 ? (
                                    <EmptyState
                                        icon={CreditCard}
                                        title="Nenhuma condição de pagamento"
                                        description="Crie condições de pagamento para reutilizar em seus pedidos."
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {paymentPresets.map((preset) => (
                                            <div
                                                key={preset.id}
                                                className={`bg-white dark:bg-gray-800 border rounded-xl p-4 flex items-center gap-4 transition-colors ${preset.isDefault
                                                        ? 'border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                                                    }`}
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                    <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                                            {preset.name}
                                                        </h3>
                                                        {preset.isDefault && (
                                                            <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
                                                                Padrão
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {preset.terms}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {!preset.isDefault && (
                                                        <button
                                                            onClick={() => handleSetDefaultPreset(preset.id)}
                                                            title="Definir como padrão"
                                                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openEditPreset(preset)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePaymentPreset(preset.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New/Edit Payment Preset Modal */}
            {showNewPresetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePresetModal} />
                    <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {editingPreset ? 'Editar Condição de Pagamento' : 'Nova Condição de Pagamento'}
                            </h3>
                            <button
                                onClick={closePresetModal}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    placeholder="Ex: Parcelado 30/60"
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Condições *
                                </label>
                                <textarea
                                    value={newPresetTerms}
                                    onChange={(e) => setNewPresetTerms(e.target.value)}
                                    placeholder="Ex: 50% em 30 dias, 50% em 60 dias"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={closePresetModal}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSavePreset}
                                    disabled={isSubmitting || !newPresetName.trim() || !newPresetTerms.trim()}
                                    className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Salvar'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Empty State Component
interface EmptyStateProps {
    icon: React.FC<{ className?: string }>;
    title: string;
    description: string;
    actionLabel?: string;
    actionLink?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionLabel, actionLink }) => (
    <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">{description}</p>
        {actionLabel && actionLink && (
            <Link
                to={actionLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
            >
                {actionLabel}
            </Link>
        )}
    </div>
);

export default FavoritesPage;
