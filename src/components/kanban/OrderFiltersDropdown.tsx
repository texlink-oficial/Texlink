import React from 'react';
import { X, Calendar, CheckCircle2, User, Package } from 'lucide-react';
import { OrderStatus } from '../../types';

type DateFilter = 'all' | 'today' | 'week' | 'month';

interface OrderFiltersDropdownProps {
    isOpen: boolean;
    dateFilter: DateFilter;
    statusFilter: OrderStatus[];
    partnerFilter: string;
    productTypeFilter: string;
    partners: { id: string; name: string }[];
    productTypes: string[];
    onDateFilterChange: (filter: DateFilter) => void;
    onStatusFilterChange: (statuses: OrderStatus[]) => void;
    onPartnerFilterChange: (partnerId: string) => void;
    onProductTypeFilterChange: (type: string) => void;
    onClearFilters: () => void;
    statusLabels: { id: OrderStatus; label: string }[];
    partnerLabel?: string; // "Marca" or "Facção"
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mês' },
];

export const OrderFiltersDropdown: React.FC<OrderFiltersDropdownProps> = ({
    isOpen,
    dateFilter,
    statusFilter,
    partnerFilter,
    productTypeFilter,
    partners,
    productTypes,
    onDateFilterChange,
    onStatusFilterChange,
    onPartnerFilterChange,
    onProductTypeFilterChange,
    onClearFilters,
    statusLabels,
    partnerLabel = 'Parceiro',
}) => {
    if (!isOpen) return null;

    const toggleStatus = (status: OrderStatus) => {
        if (statusFilter.includes(status)) {
            onStatusFilterChange(statusFilter.filter(s => s !== status));
        } else {
            onStatusFilterChange([...statusFilter, status]);
        }
    };

    const hasActiveFilters =
        dateFilter !== 'all' ||
        statusFilter.length > 0 ||
        partnerFilter !== '' ||
        productTypeFilter !== '';

    return (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Filtros</span>
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                        <X className="h-3 w-3" />
                        Limpar
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {/* Date Filter */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Período
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DATE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => onDateFilterChange(opt.value)}
                                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${dateFilter === opt.value
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {statusLabels.slice(0, 8).map(({ id, label }) => (
                            <button
                                key={id}
                                onClick={() => toggleStatus(id)}
                                className={`px-2 py-1 text-[10px] rounded-md font-medium transition-colors ${statusFilter.includes(id)
                                        ? 'bg-brand-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {label.replace('▪ ', '')}
                            </button>
                        ))}
                    </div>
                    {statusLabels.length > 8 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {statusLabels.slice(8).map(({ id, label }) => (
                                <button
                                    key={id}
                                    onClick={() => toggleStatus(id)}
                                    className={`px-2 py-1 text-[10px] rounded-md font-medium transition-colors ${statusFilter.includes(id)
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {label.replace('▪ ', '')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Partner Filter */}
                {partners.length > 0 && (
                    <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                            <User className="h-3.5 w-3.5" />
                            {partnerLabel}
                        </label>
                        <select
                            value={partnerFilter}
                            onChange={(e) => onPartnerFilterChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todos</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Product Type Filter */}
                {productTypes.length > 0 && (
                    <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                            <Package className="h-3.5 w-3.5" />
                            Tipo de Produto
                        </label>
                        <select
                            value={productTypeFilter}
                            onChange={(e) => onProductTypeFilterChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todos</option>
                            {productTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderFiltersDropdown;
