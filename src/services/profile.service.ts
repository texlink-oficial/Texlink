import api from './api';
import { User } from './auth.service';

export interface UpdateProfileDto {
    name?: string;
    email?: string;
}

export const profileService = {
    async updateProfile(data: UpdateProfileDto): Promise<User> {
        const response = await api.patch<User>('/auth/me', data);
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
    },
};
