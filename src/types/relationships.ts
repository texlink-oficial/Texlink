/**
 * Types for N:M Supplier-Brand Relationships (V3 Architecture)
 */

export type RelationshipStatus =
    | 'PENDING'
    | 'CONTRACT_PENDING'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'TERMINATED';

export type UserRole = 'ADMIN' | 'BRAND' | 'SUPPLIER';

export interface SupplierBrandRelationship {
    id: string;
    supplierId: string;
    brandId: string;
    status: RelationshipStatus;
    initiatedBy: string;
    initiatedByRole: UserRole;
    internalCode?: string;
    notes?: string;
    priority: number;
    createdAt: string;
    updatedAt: string;
    activatedAt?: string;
    suspendedAt?: string;
    terminatedAt?: string;

    // Included relations
    supplier?: SupplierCompany;
    brand?: BrandCompany;
    contract?: SupplierContract;
    specificDocuments?: BrandSpecificDocument[];
    statusHistory?: RelationshipStatusHistory[];
    initiatedByUser?: User;
}

export interface SupplierCompany {
    id: string;
    tradeName: string;
    legalName: string;
    document: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    supplierProfile?: SupplierProfile;
    onboarding?: SupplierOnboarding;
}

export interface BrandCompany {
    id: string;
    tradeName: string;
    legalName: string;
    document: string;
}

export interface SupplierProfile {
    id: string;
    companyId: string;
    productTypes: string[];
    specialties: string[];
    monthlyCapacity: number;
    currentOccupancy: number;
    avgRating?: number;
}

export interface SupplierOnboarding {
    id: string;
    supplierId: string;
    isCompleted: boolean;
    completedSteps: number[];
    documents?: OnboardingDocument[];
}

export interface OnboardingDocument {
    id: string;
    type: string;
    fileUrl: string;
    isValid?: boolean;
    validationNotes?: string;
    validatedAt?: string;
}

export interface SupplierContract {
    id: string;
    relationshipId?: string;
    documentUrl: string;
    documentHash: string;
    supplierSignedAt?: string;
    supplierSignedById?: string;
    supplierSignatureIp?: string;
    terms?: Record<string, any>;
    createdAt: string;
}

export interface BrandSpecificDocument {
    id: string;
    relationshipId: string;
    type: string;
    fileUrl: string;
    isRequired: boolean;
    uploadedAt?: string;
}

export interface RelationshipStatusHistory {
    id: string;
    relationshipId: string;
    status: RelationshipStatus;
    changedById: string;
    changedBy?: User;
    notes?: string;
    createdAt: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
}

// DTOs for API calls
export interface CreateRelationshipDto {
    supplierId: string;
    brandId: string;
    internalCode?: string;
    notes?: string;
    priority?: number;
}

export interface UpdateRelationshipDto {
    internalCode?: string;
    notes?: string;
    priority?: number;
}

export interface RelationshipActionDto {
    reason: string;
}

// Filters for listing
export interface RelationshipFilters {
    status?: RelationshipStatus;
    search?: string;
    page?: number;
    limit?: number;
}

// Statistics
export interface RelationshipStats {
    total: number;
    active: number;
    suspended: number;
    pending: number;
    contractPending: number;
    terminated: number;
}
