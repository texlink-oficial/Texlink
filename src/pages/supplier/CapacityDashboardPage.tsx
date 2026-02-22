import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { capacityService } from '../../services/capacity.service';
import { CapacityConfig, CalendarDay, CalendarDayOrder } from '../../types';
import {
    ArrowLeft,
    Calendar,
    Loader2,
    AlertTriangle,
    Users,
    Clock,
    Package,
    TrendingUp,
    Settings,
    ChevronLeft,
    ChevronRight,
    X,
    Info
} from 'lucide-react';
import { getWorkingDaysInMonth, getMonthName } from '../../utils/workingDays';

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function minutesToHours(minutes: number): string {
    const h = minutes / 60;
    return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        LANCADO_PELA_MARCA: 'Novo',
        EM_NEGOCIACAO: 'Negociação',
        ACEITO_PELA_FACCAO: 'Aceito',
        EM_PREPARACAO_SAIDA_MARCA: 'Preparando',
        EM_TRANSITO_PARA_FACCAO: 'Trânsito',
        EM_PREPARACAO_ENTRADA_FACCAO: 'Preparação',
        EM_PRODUCAO: 'Produção',
        PRONTO: 'Pronto',
        EM_TRANSITO_PARA_MARCA: 'Trânsito',
        EM_REVISAO: 'Em Revisão',
        PARCIALMENTE_APROVADO: 'Parcial',
        REPROVADO: 'Reprovado',
        AGUARDANDO_RETRABALHO: 'Retrabalho',
        FINALIZADO: 'Finalizado',
        RECUSADO_PELA_FACCAO: 'Recusado',
        DISPONIVEL_PARA_OUTRAS: 'Disponível',
    };
    return map[status] || status;
}

const CapacityDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<CapacityConfig | null>(null);
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

    // Edit modal state
    const [isEditingCapacity, setIsEditingCapacity] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editWorkers, setEditWorkers] = useState<number>(1);
    const [editHours, setEditHours] = useState<number>(8);

    // ---------------------------------------------------------------------------
    // Data loading
    // ---------------------------------------------------------------------------

    const loadConfig = useCallback(async () => {
        try {
            const data = await capacityService.getConfig();
            setConfig(data);
            setEditWorkers(data.activeWorkers ?? 1);
            setEditHours(data.hoursPerDay ?? 8);
        } catch (err) {
            console.error('Error loading capacity config:', err);
        }
    }, []);

    const loadCalendar = useCallback(async (year: number, month: number) => {
        try {
            const data = await capacityService.getCalendar(year, month);
            setCalendarDays(data);
        } catch (err) {
            console.error('Error loading calendar:', err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([
                loadConfig(),
                loadCalendar(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
            ]);
            setIsLoading(false);
        };
        init();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Reload calendar when month changes (after initial load)
    useEffect(() => {
        if (!isLoading) {
            setSelectedDay(null);
            loadCalendar(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        }
    }, [currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

    // ---------------------------------------------------------------------------
    // Derived data
    // ---------------------------------------------------------------------------

    const { occupancyPercent, totalCapacity, totalAllocated, uniqueOrderCount } = useMemo(() => {
        let cap = 0;
        let alloc = 0;
        const orderIds = new Set<string>();

        for (const day of calendarDays) {
            cap += day.totalCapacityMinutes;
            alloc += day.allocatedMinutes;
            for (const o of day.orders) {
                orderIds.add(o.id);
            }
        }

        const pct = cap > 0 ? Math.round((alloc / cap) * 100) : 0;
        return {
            occupancyPercent: Math.min(pct, 100),
            totalCapacity: cap,
            totalAllocated: alloc,
            uniqueOrderCount: orderIds.size,
        };
    }, [calendarDays]);

    const isOverloaded = occupancyPercent >= 90;
    const isWarning = occupancyPercent >= 70 && occupancyPercent < 90;

    const getCapacityColor = () => {
        if (isOverloaded) return 'text-red-500';
        if (isWarning) return 'text-yellow-500';
        return 'text-green-500';
    };

    // ---------------------------------------------------------------------------
    // Calendar grid helpers
    // ---------------------------------------------------------------------------

    const calendarDayMap = useMemo(() => {
        const map = new Map<string, CalendarDay>();
        for (const d of calendarDays) {
            map.set(d.date, d);
        }
        return map;
    }, [calendarDays]);

    const generateCalendarGrid = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();

        const cells: (string | null)[] = [];

        // Padding before first day
        for (let i = 0; i < startDay; i++) {
            cells.push(null);
        }

        // Days of month as YYYY-MM-DD strings
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dd = String(d).padStart(2, '0');
            const mm = String(month + 1).padStart(2, '0');
            cells.push(`${year}-${mm}-${dd}`);
        }

        return cells;
    };

    const getDayIndicator = (day: CalendarDay | undefined) => {
        if (!day || day.isWeekend || day.totalCapacityMinutes === 0) return null;

        const pct = day.totalCapacityMinutes > 0
            ? (day.allocatedMinutes / day.totalCapacityMinutes) * 100
            : 0;

        if (pct > 80) return 'bg-red-500';
        if (pct >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // ---------------------------------------------------------------------------
    // Month navigation
    // ---------------------------------------------------------------------------

    const goToPrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const goToToday = () => {
        setCurrentMonth(new Date());
    };

    // ---------------------------------------------------------------------------
    // Save capacity config
    // ---------------------------------------------------------------------------

    const handleSaveCapacity = async () => {
        try {
            setIsSaving(true);
            const updated = await capacityService.updateConfig({
                activeWorkers: editWorkers,
                hoursPerDay: editHours,
            });
            setConfig(updated);
            success('Ocupação atualizada com sucesso');
            setIsEditingCapacity(false);
            // Reload calendar to reflect new capacity
            await loadCalendar(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        } catch (err) {
            toastError('Erro ao atualizar ocupação. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    const todayStr = new Date().toISOString().split('T')[0];

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
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Ocupação</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Calendário de entregas e ocupação</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEditWorkers(config?.activeWorkers ?? 1);
                                setEditHours(config?.hoursPerDay ?? 8);
                                setIsEditingCapacity(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            Ajustar Ocupação
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Overload Alert */}
                {isOverloaded && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-red-700 dark:text-red-300 font-medium">
                            Atenção! Sua capacidade está acima de 90%. Considere ajustar sua disponibilidade.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* ============================================================= */}
                    {/* Left Sidebar - Occupancy Gauge & Stats                        */}
                    {/* ============================================================= */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Resumo</h2>

                            {/* Stats */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Costureiros Ativos</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {config?.activeWorkers ?? '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Horas/Dia</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {config?.hoursPerDay ?? '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Capacidade Diária</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {config?.activeWorkers != null && config?.hoursPerDay != null
                                            ? minutesToHours(config.activeWorkers * config.hoursPerDay * 60)
                                            : '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Pedidos Ativos</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {uniqueOrderCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ============================================================= */}
                    {/* Right Side - Calendar + Day Detail                            */}
                    {/* ============================================================= */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Calendar Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={goToPrevMonth}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                    <button
                                        onClick={goToToday}
                                        className="px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                                    >
                                        Hoje
                                    </button>
                                    <button
                                        onClick={goToNextMonth}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {/* Day Headers */}
                                {dayHeaders.map(day => (
                                    <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {day}
                                    </div>
                                ))}

                                {/* Calendar Cells */}
                                {generateCalendarGrid().map((dateStr, index) => {
                                    const dayData = dateStr ? calendarDayMap.get(dateStr) : undefined;
                                    const isToday = dateStr === todayStr;
                                    const isSelected = dateStr != null && selectedDay?.date === dateStr;
                                    const indicator = getDayIndicator(dayData);
                                    const isWeekend = dayData?.isWeekend ?? false;
                                    const dayNum = dateStr ? parseInt(dateStr.split('-')[2], 10) : null;

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                if (dayData) setSelectedDay(dayData);
                                            }}
                                            className={`
                                                aspect-square p-1 rounded-lg transition-colors
                                                ${dateStr ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                                                ${isWeekend && dateStr ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                                                ${isToday ? 'bg-brand-50 dark:bg-brand-900/30' : ''}
                                                ${isSelected ? 'ring-2 ring-brand-500' : ''}
                                            `}
                                        >
                                            {dayNum != null && (
                                                <div className="h-full flex flex-col">
                                                    <span className={`text-sm ${isToday ? 'font-bold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {dayNum}
                                                    </span>
                                                    {indicator && (
                                                        <div className="mt-auto flex justify-center pb-0.5">
                                                            <span className={`w-2 h-2 rounded-full ${indicator}`} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 flex items-center gap-6 justify-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                    <span className="text-gray-600 dark:text-gray-400">&lt; 50%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                                    <span className="text-gray-600 dark:text-gray-400">50-80%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    <span className="text-gray-600 dark:text-gray-400">&gt; 80%</span>
                                </div>
                            </div>
                        </div>

                        {/* ====================================================== */}
                        {/* Selected Day Detail Panel                              */}
                        {/* ====================================================== */}
                        {selectedDay && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                        })}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedDay(null)}
                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <X className="h-4 w-4 text-gray-500" />
                                    </button>
                                </div>

                                {/* Day capacity summary */}
                                {selectedDay.isWeekend ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Fim de semana - sem capacidade produtiva.</p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {minutesToHours(selectedDay.totalCapacityMinutes)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Alocado</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {minutesToHours(selectedDay.allocatedMinutes)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Disponível</p>
                                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                                {minutesToHours(selectedDay.availableMinutes)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Orders list */}
                                {selectedDay.orders.length > 0 ? (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            Pedidos ({selectedDay.orders.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedDay.orders.map((order: CalendarDayOrder) => (
                                                <div
                                                    key={order.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-mono font-medium text-brand-600 dark:text-brand-400">
                                                            {order.displayId}
                                                        </span>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {order.productName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {order.quantity.toLocaleString('pt-BR')} pcs
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                            {getStatusLabel(order.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    !selectedDay.isWeekend && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                            Nenhum pedido alocado neste dia.
                                        </p>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ================================================================= */}
            {/* Edit Capacity Modal                                               */}
            {/* ================================================================= */}
            {isEditingCapacity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditingCapacity(false)} />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Ajustar Ocupação
                        </h3>

                        <div className="space-y-4 mb-6">
                            {/* Active Workers */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Costureiros Ativos
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={editWorkers}
                                    onChange={(e) => setEditWorkers(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Hours per Day */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Horas por Dia
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={24}
                                    step={0.5}
                                    value={editHours}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            setEditHours(Math.min(24, Math.max(1, val)));
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Preview */}
                            {(() => {
                                const now = new Date();
                                const workingDays = getWorkingDaysInMonth(now.getFullYear(), now.getMonth() + 1);
                                return (
                                    <div className="p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                                        <p className="text-sm text-brand-700 dark:text-brand-300">
                                            Capacidade diária: <strong>{minutesToHours(Math.round(editWorkers * editHours * 60))}</strong>/dia
                                            <span className="text-xs ml-1 opacity-75">({minutesToHours(Math.round(editWorkers * editHours * 60 * 5))}/semana • {minutesToHours(Math.round(editWorkers * editHours * 60 * workingDays))}/mês)</span>
                                        </p>
                                        <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Baseado em {workingDays} dias úteis em {getMonthName(now.getMonth())}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditingCapacity(false)}
                                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={handleSaveCapacity}
                                className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CapacityDashboardPage;
