import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { suppliersService, SupplierDashboard } from '../../services';
import {
    ArrowLeft,
    Calendar,
    Loader2,
    AlertTriangle,
    Package,
    TrendingUp,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

interface DeliveryItem {
    orderId: string;
    displayId: string;
    productName: string;
    quantity: number;
    deadline: string;
}

const formatDate = (date: Date) => date.toLocaleDateString('pt-BR');

const CapacityDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<SupplierDashboard | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isEditingCapacity, setIsEditingCapacity] = useState(false);
    const [newCapacity, setNewCapacity] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const data = await suppliersService.getDashboard();
            setProfile(data);
            setNewCapacity(data.profile?.monthlyCapacity || 1000);
        } catch (error) {
            console.error('Error loading capacity data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const capacityPercentage = profile?.stats?.capacityUsage || 0;
    const isOverloaded = capacityPercentage >= 90;
    const isWarning = capacityPercentage >= 70 && capacityPercentage < 90;

    const getCapacityColor = () => {
        if (isOverloaded) return 'text-red-500';
        if (isWarning) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getCapacityBg = () => {
        if (isOverloaded) return 'from-red-500 to-red-600';
        if (isWarning) return 'from-yellow-500 to-yellow-600';
        return 'from-green-500 to-green-600';
    };

    // Calendar generation
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty days for padding
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }

        // Add days of month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/supplier" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Capacidade</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Calendário de entregas e ocupação</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsEditingCapacity(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            Ajustar Capacidade
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Alert */}
                {isOverloaded && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-red-700 dark:text-red-300 font-medium">
                            Atenção! Sua capacidade está acima de 90%. Considere ajustar sua disponibilidade.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Capacity Gauge */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Ocupação Atual</h2>

                            {/* Circular Gauge */}
                            <div className="relative w-48 h-48 mx-auto mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        className="text-gray-200 dark:text-gray-700"
                                    />
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${capacityPercentage * 5.52} 552`}
                                        strokeLinecap="round"
                                        className={getCapacityColor()}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-bold ${getCapacityColor()}`}>
                                        {capacityPercentage}%
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">ocupado</span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Capacidade Mensal</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {profile?.profile?.monthlyCapacity?.toLocaleString('pt-BR')} pçs
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Ocupação Atual</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {profile?.profile?.currentOccupancy?.toLocaleString('pt-BR')} pçs
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Pedidos Ativos</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {profile?.stats?.activeOrders || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentMonth(new Date())}
                                        className="px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                                    >
                                        Hoje
                                    </button>
                                    <button
                                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {/* Day Headers */}
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {day}
                                    </div>
                                ))}

                                {/* Calendar Days */}
                                {generateCalendarDays().map((date, index) => {
                                    const isToday = date && date.toDateString() === new Date().toDateString();
                                    const isSelected = date && selectedDate && date.toDateString() === selectedDate.toDateString();

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => date && setSelectedDate(date)}
                                            className={`
                        aspect-square p-1 rounded-lg transition-colors cursor-pointer
                        ${date ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                        ${isToday ? 'bg-brand-50 dark:bg-brand-900/30' : ''}
                        ${isSelected ? 'ring-2 ring-brand-500' : ''}
                      `}
                                        >
                                            {date && (
                                                <div className="h-full flex flex-col">
                                                    <span className={`text-sm ${isToday ? 'font-bold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {date.getDate()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 flex items-center gap-6 justify-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded" />
                                    <span className="text-gray-600 dark:text-gray-400">Disponível</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-yellow-500 rounded" />
                                    <span className="text-gray-600 dark:text-gray-400">Moderado</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded" />
                                    <span className="text-gray-600 dark:text-gray-400">Lotado</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Capacity Modal */}
            {isEditingCapacity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditingCapacity(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Ajustar Capacidade Mensal
                        </h3>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Capacidade (peças/mês)
                            </label>
                            <input
                                type="number"
                                value={newCapacity}
                                onChange={(e) => setNewCapacity(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditingCapacity(false)}
                                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Call API to update capacity
                                    setIsEditingCapacity(false);
                                }}
                                className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CapacityDashboardPage;
