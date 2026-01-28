export type SupplierCredentialStatus =
    | 'DRAFT'
    | 'PENDING_VALIDATION'
    | 'VALIDATING'
    | 'VALIDATION_FAILED'
    | 'PENDING_COMPLIANCE'
    | 'COMPLIANCE_APPROVED'
    | 'COMPLIANCE_REJECTED'
    | 'INVITATION_PENDING'
    | 'INVITATION_SENT'
    | 'INVITATION_OPENED'
    | 'INVITATION_EXPIRED'
    | 'ONBOARDING_STARTED'
    | 'ONBOARDING_IN_PROGRESS'
    | 'CONTRACT_PENDING'
    | 'CONTRACT_SIGNED'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'BLOCKED';

export type CredentialCategory =
    | 'CONFECCAO'
    | 'BORDADO'
    | 'ESTAMPARIA'
    | 'LAVANDERIA'
    | 'MALHARIA'
    | 'COSTURA'
    | 'OUTRO';

export interface SupplierCredential {
    id: string;
    cnpj: string;
    tradeName?: string;
    legalName?: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp?: string;
    internalCode?: string;
    category?: CredentialCategory;
    notes?: string;
    priority: number;
    status: SupplierCredentialStatus;
    brandId: string;
    supplierId?: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    validations?: CredentialValidation[];
    compliance?: SupplierCompliance;
    invitations?: CredentialInvitation[];
    statusHistory?: CredentialStatusHistory[];
}

export interface CredentialValidation {
    id: string;
    credentialId: string;
    cnpj: string;
    source: string;
    validatedAt: string;
    result: 'SUCCESS' | 'FAILED' | 'PARTIAL';
    data?: any;
    errors?: string[];
    razaoSocial?: string;
    nomeFantasia?: string;
    situacao?: string;
    dataAbertura?: string;
    endereco?: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        municipio: string;
        uf: string;
        cep: string;
    };
    responseTime?: number;
    rawResponse?: any;
}

export type RecommendationType = 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';

export interface ManualReview {
    reviewedById: string;
    reviewedBy?: {
        id: string;
        name: string;
        email: string;
    };
    reviewedAt: string;
    decision: 'APPROVED' | 'REJECTED';
    approvalNotes?: string;
    rejectionReason?: string;
    rejectionDetails?: string;
}

export interface ComplianceAnalysis {
    id: string;
    credentialId: string;
    analyzedAt: string;
    source: string;
    overallScore: number;
    creditScore?: number;
    fiscalScore?: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    approved: boolean;
    recommendation: RecommendationType;
    riskFactors?: string[];
    reasons?: string[];
    details?: any;
    pendingIssues?: string[];
    recommendations?: string[];
    creditAnalysis?: any;
    legalAnalysis?: any;
    financialAnalysis?: any;
    manualReview?: ManualReview;
    // Legacy fields for backward compatibility
    rejectionReason?: string;
    notes?: string;
    reviewedById?: string;
    reviewedAt?: string;
}

// Mantém compatibilidade com código existente
export type SupplierCompliance = ComplianceAnalysis;

export type InvitationChannel = 'EMAIL' | 'WHATSAPP' | 'BOTH';

export interface CredentialInvitation {
    id: string;
    credentialId: string;
    channel: InvitationChannel;
    sentAt: string;
    sentBy: string;
    sentTo: string;
    token: string;
    expiresAt: string;
    openedAt?: string;
    respondedAt?: string;
    status: 'PENDING' | 'SENT' | 'OPENED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    customMessage?: string;
    metadata?: any;
    // Campos de rastreamento de webhooks
    deliveredAt?: string;
    clickedAt?: string;
    // Campos opcionais para compatibilidade
    recipientEmail?: string;
    recipientPhone?: string;
    acceptedAt?: string;
    openCount?: number;
    lastOpenedAt?: string;
    ipAddress?: string;
    userAgent?: string;
    sentById?: string;
    messageId?: string;
}

export interface CredentialStatusHistory {
    id: string;
    credentialId: string;
    previousStatus?: SupplierCredentialStatus;
    newStatus: SupplierCredentialStatus;
    changedAt: string;
    changedById: string;
    reason?: string;
    changedBy?: {
        id: string;
        name: string;
    };
    // Compatibilidade com código existente
    fromStatus?: SupplierCredentialStatus;
    toStatus?: SupplierCredentialStatus;
    performedById?: string;
    createdAt?: string;
}

export interface CredentialStats {
    total: number;
    byStatus: Record<string, number>;
    thisMonth: {
        created: number;
        completed: number;
    };
    pendingAction: number;
    awaitingResponse: number;
    activeCount: number;
    conversionRate: number;
}

export interface CreateCredentialDto {
    cnpj: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp?: string;
    category?: CredentialCategory;
    notes?: string;
    status?: 'DRAFT' | 'PENDING_VALIDATION';
}

export interface UpdateCredentialDto {
    cnpj?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    category?: CredentialCategory;
    notes?: string;
}

export interface CredentialFilters {
    search?: string;
    status?: SupplierCredentialStatus;
    statuses?: SupplierCredentialStatus[];
    category?: CredentialCategory;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CredentialListResponse {
    data: SupplierCredential[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

export interface SendInvitationDto {
    channel: InvitationChannel;
    customMessage?: string;
    templateId?: string;
    // Compatibilidade com código existente
    recipientEmail?: string;
    recipientPhone?: string;
    message?: string;
}

export interface ResendInvitationDto {
    channel?: InvitationChannel;
    customMessage?: string;
}

export interface ApproveCredentialDto {
    approvalNotes: string;
}

export interface RejectCredentialDto {
    rejectionReason: string;
    rejectionDetails: string;
}

export interface InvitationTemplate {
    id: string;
    name: string;
    description?: string;
    subject: string;
    body: string;
    channel: InvitationChannel | 'ALL';
    isDefault: boolean;
    variables?: string[];
    createdAt: string;
    updatedAt: string;
}
