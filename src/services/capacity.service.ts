import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { CapacityConfig, CalendarDay } from '../types';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_CAPACITY_CONFIG: CapacityConfig = {
    activeWorkers: 12,
    hoursPerDay: 8.5,
    monthlyCapacity: 134640,
    currentOccupancy: 0,
    productTypes: ['Infantil', 'Adulto', 'Fitness'],
    specialties: ['Malha', 'Jeans', 'Moletom'],
};

function generateMockCalendar(year: number, month: number): CalendarDay[] {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: CalendarDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const totalCapacityMinutes = isWeekend ? 0 : 6120;
        const allocatedMinutes = isWeekend ? 0 : Math.round(Math.random() * 4000);

        days.push({
            date: date.toISOString().split('T')[0],
            dayOfWeek,
            isWeekend,
            totalCapacityMinutes,
            allocatedMinutes,
            availableMinutes: Math.max(0, totalCapacityMinutes - allocatedMinutes),
            orders: [],
        });
    }

    return days;
}

// =============================================================================
// SERVICE
// =============================================================================

export const capacityService = {
    async getConfig(): Promise<CapacityConfig> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_CAPACITY_CONFIG;
        }
        const response = await api.get<CapacityConfig>('/capacity/config');
        return response.data;
    },

    async updateConfig(data: { activeWorkers: number; hoursPerDay: number }): Promise<CapacityConfig> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            const monthlyCapacity = Math.round(data.activeWorkers * data.hoursPerDay * 60 * 22);
            return { ...MOCK_CAPACITY_CONFIG, ...data, monthlyCapacity };
        }
        const response = await api.patch<CapacityConfig>('/capacity/config', data);
        return response.data;
    },

    async getCalendar(year: number, month: number): Promise<CalendarDay[]> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            return generateMockCalendar(year, month);
        }
        const response = await api.get<CalendarDay[]>('/capacity/calendar', {
            params: { year, month },
        });
        return response.data;
    },

    async acceptOrder(data: {
        orderId: string;
        avgTimePerPiece: number;
        plannedStartDate: string;
    }): Promise<any> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            return { id: data.orderId, status: 'ACEITO_PELA_FACCAO' };
        }
        const response = await api.post('/capacity/accept-order', data);
        return response.data;
    },
};
