import api from './api';

export interface Company {
    id: string;
    legalName: string;
    tradeName?: string;
    document: string;
    type: 'BRAND' | 'SUPPLIER';
    city: string;
    state: string;
    phone?: string;
    email?: string;
    avgRating: number;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    supplierProfile?: SupplierProfile;
}

export interface SupplierProfile {
    id: string;
    onboardingPhase: number;
    onboardingComplete: boolean;
    productTypes: string[];
    specialties: string[];
    monthlyCapacity?: number;
    currentOccupancy: number;
}

export interface CreateCompanyDto {
    legalName: string;
    tradeName?: string;
    document: string;
    type: 'BRAND' | 'SUPPLIER';
    city: string;
    state: string;
    phone?: string;
    email?: string;
}

export const companiesService = {
    async create(data: CreateCompanyDto): Promise<Company> {
        const response = await api.post<Company>('/companies', data);
        return response.data;
    },

    async getMyCompanies(): Promise<Company[]> {
        const response = await api.get<Company[]>('/companies/me');
        return response.data;
    },

    async getById(id: string): Promise<Company> {
        const response = await api.get<Company>(`/companies/${id}`);
        return response.data;
    },

    async update(id: string, data: Partial<CreateCompanyDto>): Promise<Company> {
        const response = await api.patch<Company>(`/companies/${id}`, data);
        return response.data;
    },
};
