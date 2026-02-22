import api from './api';
import { User } from './auth.service';

export interface UpdateProfileDto {
    name?: string;
    email?: string;
}

export const profileService = {
    async updateProfile(data: UpdateProfileDto): Promise<User> {
        // SEC-F001: No longer store user PII in localStorage — caller should update React context
        const response = await api.patch<User>('/auth/me', data);
        return response.data;
    },
};
