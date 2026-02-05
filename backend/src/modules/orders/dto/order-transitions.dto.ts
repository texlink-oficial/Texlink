import { OrderStatus } from '@prisma/client';

export interface AvailableTransition {
  nextStatus: OrderStatus;
  label: string;
  description: string;
  requiresConfirmation: boolean;
  requiresNotes: boolean;
  requiresReview: boolean;
}

export interface TransitionResponse {
  canAdvance: boolean;
  waitingFor: 'BRAND' | 'SUPPLIER' | null;
  waitingLabel: string;
  transitions: AvailableTransition[];
}
