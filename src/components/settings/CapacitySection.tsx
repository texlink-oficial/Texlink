import React, { useState, useEffect } from 'react';
import {
    Factory,
    Package,
    Scissors,
    Save,
    Loader2,
    X,
    Check,
    Plus,
    Trash2,
    Users,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import { CapacitySettings } from '../../types';
import { PRODUCT_TYPE_OPTIONS, MACHINE_OPTIONS as SPECIALTY_OPTIONS } from '../../constants/supplierOptions';

const CapacitySection: React.FC = () => {
    const [data, setData] = useState<CapacitySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        activeWorkers: 0,
        hoursPerDay: 8,
        monthlyCapacity: 0,
        currentOccupancy: 0,
        productTypes: [] as string[],
        specialties: [] as string[],
    });

    const [newProductType, setNewProductType] = useState('');
    const [newSpecialty, setNewSpecialty] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const capacity = await settingsService.getCapacitySettings();
            setData(capacity);
            const workers = capacity.activeWorkers || 0;
            const hours = capacity.hoursPerDay || 8;
            setFormData({
                activeWorkers: workers,
                hoursPerDay: hours,
                monthlyCapacity: workers > 0 ? workers * hours * 60 * 22 : (capacity.monthlyCapacity || 0),
                currentOccupancy: capacity.currentOccupancy || 0,
                productTypes: capacity.productTypes || [],
                specialties: capacity.specialties || [],
            });
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        const DECIMAL_FIELDS = ['hoursPerDay'];
        const numericValue = DECIMAL_FIELDS.includes(name)
            ? parseFloat(value) || 0
            : parseInt(value) || 0;

        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: type === 'number' ? numericValue : value,
            };

            // Auto-calculate monthlyCapacity when workers or hours change
            if (name === 'activeWorkers' || name === 'hoursPerDay') {
                updated.monthlyCapacity = updated.activeWorkers * updated.hoursPerDay * 60 * 22;
            }

            return updated;
        });
    };

    const addProductType = (type: string) => {
        if (type && !formData.productTypes.includes(type)) {
            setFormData(prev => ({
                ...prev,
                productTypes: [...prev.productTypes, type],
            }));
        }
        setNewProductType('');
    };

    const removeProductType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            productTypes: prev.productTypes.filter(t => t !== type),
        }));
    };

    const addSpecialty = (specialty: string) => {
        if (specialty && !formData.specialties.includes(specialty)) {
            setFormData(prev => ({
                ...prev,
                specialties: [...prev.specialties, specialty],
            }));
        }
        setNewSpecialty('');
    };

    const removeSpecialty = (specialty: string) => {
        setFormData(prev => ({
            ...prev,
            specialties: prev.specialties.filter(s => s !== specialty),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            setIsSaving(true);
            const updated = await settingsService.updateCapacitySettings(formData);
            setData(updated);
            setSuccess('Capacidade produtiva atualizada com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                    <Factory className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Capacidade Produtiva</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Defina sua capacidade de produção e especialidades
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Workers & Hours */}
                <div>
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <Users className="w-4 h-4" />
                        Equipe de Produção
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Costureiros Ativos
                            </label>
                            <input
                                type="number"
                                name="activeWorkers"
                                value={formData.activeWorkers}
                                onChange={handleChange}
                                min={1}
                                max={9999}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Número de costureiros trabalhando atualmente
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Horas por Dia
                            </label>
                            <input
                                type="number"
                                name="hoursPerDay"
                                value={formData.hoursPerDay}
                                onChange={handleChange}
                                min={1}
                                max={24}
                                step={0.5}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Jornada diária de trabalho por costureiro
                            </p>
                        </div>
                    </div>
                </div>

                {/* Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Capacidade Mensal (minutos)
                        </label>
                        <input
                            type="number"
                            name="monthlyCapacity"
                            value={formData.monthlyCapacity}
                            readOnly
                            disabled
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Calculado automaticamente com base nos costureiros e horas
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Ocupação Atual (%)
                        </label>
                        <input
                            type="number"
                            name="currentOccupancy"
                            value={formData.currentOccupancy}
                            onChange={handleChange}
                            min={0}
                            max={100}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Percentual da sua capacidade atualmente ocupada
                        </p>
                    </div>
                </div>

                {/* Occupancy Visualization */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            Ocupação: {formData.currentOccupancy}%
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            Disponível: {Math.round((100 - formData.currentOccupancy) * formData.monthlyCapacity / 100)} min
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all ${
                                formData.currentOccupancy >= 90
                                    ? 'bg-red-500'
                                    : formData.currentOccupancy >= 70
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                            }`}
                            style={{ width: `${formData.currentOccupancy}%` }}
                        />
                    </div>
                </div>

                {/* Product Types */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <Package className="w-4 h-4" />
                        Tipos de Produto
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {formData.productTypes.map(type => (
                            <span
                                key={type}
                                className="flex items-center gap-1 px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-sm"
                            >
                                {type}
                                <button
                                    type="button"
                                    onClick={() => removeProductType(type)}
                                    className="p-0.5 hover:bg-brand-200 dark:hover:bg-brand-800 rounded-full"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={newProductType}
                            onChange={(e) => setNewProductType(e.target.value)}
                            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        >
                            <option value="">Selecione um tipo</option>
                            {PRODUCT_TYPE_OPTIONS.filter(t => !formData.productTypes.includes(t)).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => addProductType(newProductType)}
                            disabled={!newProductType}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar
                        </button>
                    </div>
                </div>

                {/* Specialties */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <Scissors className="w-4 h-4" />
                        Especialidades
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {formData.specialties.map(specialty => (
                            <span
                                key={specialty}
                                className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm"
                            >
                                {specialty}
                                <button
                                    type="button"
                                    onClick={() => removeSpecialty(specialty)}
                                    className="p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        >
                            <option value="">Selecione uma especialidade</option>
                            {SPECIALTY_OPTIONS.filter(s => !formData.specialties.includes(s)).map(specialty => (
                                <option key={specialty} value={specialty}>{specialty}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => addSpecialty(newSpecialty)}
                            disabled={!newSpecialty}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar
                        </button>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Salvar Capacidade
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CapacitySection;
