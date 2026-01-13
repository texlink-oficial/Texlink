export enum OrderStatus {
  NEW = 'NOVO',
  NEGOTIATION = 'NEGOCIACAO',
  WAITING = 'AGUARDANDO',
  PRODUCTION = 'PRODUCAO',
  READY_SEND = 'PRONTO_ENVIO',
  TRANSIT_TO_BRAND = 'TRANSITO_MARCA',
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