import api from './api';
import { CapacityConfig, CalendarDay } from '../types';

export const capacityService = {
    async getConfig(): Promise<CapacityConfig> {
        const response = await api.get<CapacityConfig>('/capacity/config');
        return response.data;
    },

    async updateConfig(data: { activeWorkers: number; hoursPerDay: number }): Promise<CapacityConfig> {
        const response = await api.patch<CapacityConfig>('/capacity/config', data);
        return response.data;
    },

    async getCalendar(year: number, month: number): Promise<CalendarDay[]> {
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
        const response = await api.post('/capacity/accept-order', data);
        return response.data;
    },
};
