export enum OrderStatus {
  NEW = 'NOVO',
  NEGOTIATING = 'EM_NEGOCIACAO',
  ACCEPTED = 'ACEITO',
  PREPARING_BRAND = 'PREPARACAO_MARCA',
  TRANSIT_TO_SUPPLIER = 'TRANSITO_FACCAO',
  RECEIVED_SUPPLIER = 'RECEBIDO_FACCAO',
  PRODUCTION = 'PRODUCAO',
  READY_SEND = 'PRONTO_ENVIO',
  TRANSIT_TO_BRAND = 'TRANSITO_MARCA',
  IN_REVIEW = 'EM_REVISAO',
  PARTIALLY_APPROVED = 'PARCIALMENTE_APROVADO',
  DISAPPROVED = 'REPROVADO',
  AWAITING_REWORK = 'AGUARDANDO_RETRABALHO',
  FINALIZED = 'FINALIZADO',
  REJECTED = 'RECUSADO'
}

export interface TimelineEvent {
  step: string;
  date?: string;
  completed: boolean;
  icon?: 'check' | 'truck' | 'clock' | 'scissors' | 'box';
}

export interface Attachment {
  id: string;
  type: 'video' | 'pdf' | 'image' | 'doc';
  name: string;
  url: string;
  size?: string;
}

export interface Brand {
  id: string;
  name: string;
  rating: number; // 3.5 to 5.0
  location: string;
  image: string;
}

export interface Order {
  id: string;
  displayId: string;
  brand: Brand;
  type: 'Infantil' | 'Adulto';
  productName: string;
  op?: string; // Ordem de Produção
  artigo?: string; // Código do Artigo
  quantity: number; // 300 to 2500
  pricePerUnit: number; // 39.90 or 50.00 approx
  totalValue: number;
  deliveryDeadline: string;
  status: OrderStatus;
  waitingReason?: string; // e.g., "Aguardando Zíper"
  missingItems?: string[]; // New: Intelligent Checklist items
  paymentTerms: string;
  paymentStatus: 'paid' | 'pending' | 'late' | 'partial'; // New: Financial Status
  description: string;
  observations?: string;
  techSheetUrl?: string;
  attachments?: Attachment[];
  materialsProvided: boolean;
  createdAt: string;
  timeline: TimelineEvent[];
}

export interface WorkshopProfile {
  name: string;
  rating: number;
  isActive: boolean;
  activeOrders: number;
  completedOrdersThisMonth: number;
  capacityUsage: number; // New: 0 to 100 percentage
}

// Negotiation Types
export interface ProposalValues {
  pricePerUnit?: number;
  quantity?: number;
  deliveryDeadline?: string;
}

export interface Message {
  id: string;
  type: 'text' | 'proposal';
  text?: string;
  proposal?: {
    original: ProposalValues;
    new: ProposalValues;
    status: 'pending' | 'accepted' | 'rejected';
  };
  sender: 'me' | 'brand';
  timestamp: string;
  read: boolean;
}

// ==================== SUPPLIER DOCUMENTS ====================

export type SupplierDocumentType =
  | 'ABVTEX_TERMO'
  | 'CNPJ_ATIVO'
  | 'CND_FEDERAL'
  | 'CRF_FGTS'
  | 'GUIA_INSS'
  | 'GUIA_FGTS'
  | 'GUIA_SIMPLES_DAS'
  | 'LICENCA_FUNCIONAMENTO'
  | 'AVCB'
  | 'CONTRATO_SOCIAL'
  | 'INSCRICAO_MUNICIPAL'
  | 'RELATORIO_EMPREGADOS'
  | 'RELACAO_SUBCONTRATADOS'
  | 'LICENCA_AMBIENTAL'
  | 'LAUDO_NR1_GRO_PGR'
  | 'LAUDO_NR7_PCMSO'
  | 'LAUDO_NR10_SEGURANCA_ELETRICA'
  | 'LAUDO_NR15_INSALUBRIDADE'
  | 'LAUDO_NR17_AET'
  | 'OUTRO';

export type SupplierDocumentStatus = 'PENDING' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

export interface SupplierDocument {
  id: string;
  companyId: string;
  type: SupplierDocumentType;
  status: SupplierDocumentStatus;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string;
  competenceMonth?: number;
  competenceYear?: number;
  expiresAt?: string;
  notes?: string;
  uploadedBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDocumentSummary {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  pending: number;
}

export interface SupplierDocumentChecklistItem {
  type: SupplierDocumentType;
  documentId: string | null;
  status: SupplierDocumentStatus;
  hasFile: boolean;
  expiresAt: string | null;
  isMonthly: boolean;
  requiresExpiry: boolean;
}

// ==================== PARTNERS ====================

export type PartnerCategory =
  | 'HEALTH_WELLNESS'
  | 'COMPLIANCE'
  | 'ACCOUNTING'
  | 'FINANCE'
  | 'TECHNOLOGY'
  | 'TRAINING'
  | 'INSURANCE'
  | 'OTHER';

export interface Partner {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  website: string;
  category: PartnerCategory;
  benefits: string[];
  contactEmail?: string;
  contactPhone?: string;
  discountCode?: string;
  discountInfo?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerCategoryCount {
  category: PartnerCategory;
  count: number;
}

export const PARTNER_CATEGORY_LABELS: Record<PartnerCategory, string> = {
  HEALTH_WELLNESS: 'Saúde e Bem-estar',
  COMPLIANCE: 'Compliance e NR',
  ACCOUNTING: 'Contabilidade',
  FINANCE: 'Financeiro',
  TECHNOLOGY: 'Tecnologia',
  TRAINING: 'Treinamentos',
  INSURANCE: 'Seguros',
  OTHER: 'Outros',
};

export const PARTNER_CATEGORY_ICONS: Record<PartnerCategory, string> = {
  HEALTH_WELLNESS: 'Heart',
  COMPLIANCE: 'Shield',
  ACCOUNTING: 'Calculator',
  FINANCE: 'DollarSign',
  TECHNOLOGY: 'Cpu',
  TRAINING: 'GraduationCap',
  INSURANCE: 'Umbrella',
  OTHER: 'MoreHorizontal',
};

// ==================== EDUCATIONAL CONTENT ====================

export type EducationalContentType = 'VIDEO' | 'IMAGE' | 'DOCUMENT' | 'ARTICLE';
export type EducationalContentCategory =
  | 'TUTORIAL_SISTEMA'
  | 'BOAS_PRATICAS'
  | 'COMPLIANCE'
  | 'PRODUCAO'
  | 'FINANCEIRO'
  | 'QUALIDADE'
  | 'NOVIDADES';

export interface EducationalContent {
  id: string;
  title: string;
  description: string;
  contentType: EducationalContentType;
  contentUrl: string;
  thumbnailUrl?: string;
  category: EducationalContentCategory;
  duration?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EducationalContentCategoryCount {
  category: EducationalContentCategory;
  count: number;
}

export const EDUCATIONAL_CONTENT_TYPE_LABELS: Record<EducationalContentType, string> = {
  VIDEO: 'Vídeo',
  IMAGE: 'Imagem',
  DOCUMENT: 'Documento',
  ARTICLE: 'Artigo',
};

export const EDUCATIONAL_CATEGORY_LABELS: Record<EducationalContentCategory, string> = {
  TUTORIAL_SISTEMA: 'Tutorial do Sistema',
  BOAS_PRATICAS: 'Boas Práticas',
  COMPLIANCE: 'Compliance',
  PRODUCAO: 'Produção',
  FINANCEIRO: 'Financeiro',
  QUALIDADE: 'Qualidade',
  NOVIDADES: 'Novidades',
};

// ==================== SUPPORT TICKETS ====================

export type SupportTicketStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO_RESPOSTA' | 'RESOLVIDO' | 'FECHADO';
export type SupportTicketPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type SupportTicketCategory = 'PEDIDOS' | 'PAGAMENTOS' | 'ACESSO' | 'TECNICO' | 'OUTROS';

export interface SupportTicket {
  id: string;
  displayId: string;
  companyId: string;
  createdById: string;
  assignedToId?: string;
  title: string;
  description: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  createdBy?: { id: string; name: string };
  assignedTo?: { id: string; name: string };
  company?: { id: string; tradeName: string };
  _count?: { messages: number };
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  attachments: string[];
  isFromSupport: boolean;
  isInternal: boolean;
  createdAt: string;
  sender?: { id: string; name: string };
}

export interface SupportTicketStats {
  total: number;
  abertos: number;
  emAndamento: number;
  resolvidos: number;
  urgentes: number;
  tempoMedioResposta: number;
}

export const TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_RESPOSTA: 'Aguardando Resposta',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

export const TICKET_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  PEDIDOS: 'Pedidos',
  PAGAMENTOS: 'Pagamentos',
  ACESSO: 'Acesso à Plataforma',
  TECNICO: 'Problemas Técnicos',
  OUTROS: 'Outros',
};

// ==================== SETTINGS ====================

export type AccountType = 'CORRENTE' | 'POUPANCA';
export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
export type SuggestionCategory = 'FUNCIONALIDADE' | 'USABILIDADE' | 'BUG' | 'PERFORMANCE' | 'OUTRO';
export type SuggestionStatus = 'ENVIADO' | 'EM_ANALISE' | 'IMPLEMENTADO' | 'REJEITADO';

export interface CompanyData {
  id: string;
  legalName: string;
  tradeName?: string;
  document: string;
  phone?: string;
  email?: string;
  city: string;
  state: string;
  logoUrl?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  zipCode?: string;
}

export interface BankAccount {
  id: string;
  companyId: string;
  bankCode: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  accountType: AccountType;
  accountHolder: string;
  holderDocument: string;
  pixKeyType?: PixKeyType;
  pixKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  id: string;
  companyId: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  newOrdersEmail: boolean;
  newOrdersWhatsapp: boolean;
  messagesEmail: boolean;
  messagesWhatsapp: boolean;
  paymentsEmail: boolean;
  paymentsWhatsapp: boolean;
  deadlineReminders: boolean;
  systemUpdates: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CapacitySettings {
  monthlyCapacity: number | null;
  currentOccupancy: number;
  productTypes: string[];
  specialties: string[];
}

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  status: SuggestionStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  FUNCIONALIDADE: 'Nova Funcionalidade',
  USABILIDADE: 'Usabilidade',
  BUG: 'Correção de Bug',
  PERFORMANCE: 'Performance',
  OUTRO: 'Outro',
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  ENVIADO: 'Enviado',
  EM_ANALISE: 'Em Análise',
  IMPLEMENTADO: 'Implementado',
  REJEITADO: 'Rejeitado',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CORRENTE: 'Conta Corrente',
  POUPANCA: 'Conta Poupança',
};

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave Aleatória',
};

// Document type labels in Portuguese
export const SUPPLIER_DOCUMENT_TYPE_LABELS: Record<SupplierDocumentType, string> = {
  ABVTEX_TERMO: 'Termo de Participação ABVTEX',
  CNPJ_ATIVO: 'Cartão CNPJ (situação ativa)',
  CND_FEDERAL: 'Certidão Negativa de Débitos Federais',
  CRF_FGTS: 'Certificado de Regularidade do FGTS',
  GUIA_INSS: 'Guia e comprovante de pagamento do INSS',
  GUIA_FGTS: 'Guia e comprovante de pagamento de FGTS',
  GUIA_SIMPLES_DAS: 'Guia e comprovante do Simples Nacional (DAS)',
  LICENCA_FUNCIONAMENTO: 'Licença de Funcionamento',
  AVCB: 'Auto de Vistoria do Corpo de Bombeiros',
  CONTRATO_SOCIAL: 'Contrato Social / Requerimento do Empresário',
  INSCRICAO_MUNICIPAL: 'Inscrição Municipal',
  RELATORIO_EMPREGADOS: 'Relatório de empregados (CAGED/eSocial/RAIS)',
  RELACAO_SUBCONTRATADOS: 'Relação de subcontratados',
  LICENCA_AMBIENTAL: 'Licença Ambiental',
  LAUDO_NR1_GRO_PGR: 'Laudo NR-1 – GRO / PGR',
  LAUDO_NR7_PCMSO: 'Laudo NR-7 – PCMSO',
  LAUDO_NR10_SEGURANCA_ELETRICA: 'Laudo NR-10 – Segurança Elétrica',
  LAUDO_NR15_INSALUBRIDADE: 'Laudo NR-15 – Insalubridade',
  LAUDO_NR17_AET: 'Laudo NR-17 – AET (Análise Ergonômica)',
  OUTRO: 'Outro documento',
};