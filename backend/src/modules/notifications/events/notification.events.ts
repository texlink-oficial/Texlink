/**
 * Notification Domain Events
 *
 * These are the event names emitted by various services
 * and consumed by the notification event handlers
 */

// Order Events
export const ORDER_CREATED = 'order.created';
export const ORDER_ACCEPTED = 'order.accepted';
export const ORDER_REJECTED = 'order.rejected';
export const ORDER_STATUS_CHANGED = 'order.status.changed';
export const ORDER_FINALIZED = 'order.finalized';
export const ORDER_DEADLINE_APPROACHING = 'order.deadline.approaching';

// Message/Chat Events
export const MESSAGE_SENT = 'message.sent';
export const MESSAGE_UNREAD_REMINDER = 'message.unread.reminder';
export const PROPOSAL_SENT = 'proposal.sent';
export const PROPOSAL_RESPONDED = 'proposal.responded';

// Credential Events
export const CREDENTIAL_INVITE_SENT = 'credential.invite.sent';
export const CREDENTIAL_STATUS_CHANGED = 'credential.status.changed';
export const CREDENTIAL_COMPLETED = 'credential.completed';

// Document Events
export const DOCUMENT_UPLOADED = 'document.uploaded';
export const DOCUMENT_EXPIRING = 'document.expiring';
export const DOCUMENT_EXPIRED = 'document.expired';
export const DOCUMENT_SHARING_CONSENT_REVOKED = 'document.sharing.consent.revoked';
export const SUPPLIER_DOCUMENT_EXPIRING_FOR_BRAND = 'supplier.document.expiring.for.brand';
export const SUPPLIER_DOCUMENT_UPDATED = 'supplier.document.updated';

// Payment Events
export const PAYMENT_REGISTERED = 'payment.registered';
export const PAYMENT_STATUS_CHANGED = 'payment.status.changed';
export const PAYMENT_RECEIVED = 'payment.received';
export const PAYMENT_OVERDUE = 'payment.overdue';

// Support Ticket Events
export const TICKET_CREATED = 'ticket.created';
export const TICKET_MESSAGE_ADDED = 'ticket.message.added';
export const TICKET_STATUS_CHANGED = 'ticket.status.changed';

// Relationship Events
export const RELATIONSHIP_REQUESTED = 'relationship.requested';
export const RELATIONSHIP_STATUS_CHANGED = 'relationship.status.changed';

// Partnership Request Events
export const PARTNERSHIP_REQUEST_RECEIVED = 'partnership.request.received';
export const PARTNERSHIP_REQUEST_ACCEPTED = 'partnership.request.accepted';
export const PARTNERSHIP_REQUEST_REJECTED = 'partnership.request.rejected';
export const PARTNERSHIP_REQUEST_CANCELLED = 'partnership.request.cancelled';

// Supplier Interest Events
export const SUPPLIER_INTEREST_EXPRESSED = 'supplier.interest.expressed';

// Rating Events
export const RATING_RECEIVED = 'rating.received';

// Supplier Approval Events
export const SUPPLIER_STATUS_CHANGED = 'supplier.status.changed';

// System Events
export const SYSTEM_ANNOUNCEMENT = 'system.announcement';

// Code of Conduct Events
export const CODE_OF_CONDUCT_UPLOADED = 'code.of.conduct.uploaded';
export const CODE_OF_CONDUCT_UPDATED = 'code.of.conduct.updated';
export const CODE_OF_CONDUCT_ACCEPTED = 'code.of.conduct.accepted';
export const CODE_OF_CONDUCT_REMINDER = 'code.of.conduct.reminder';

// Contract Events
export const CONTRACT_CREATED = 'contract.created';
export const CONTRACT_SENT_FOR_SIGNATURE = 'contract.sent.for.signature';
export const CONTRACT_REVISION_REQUESTED = 'contract.revision.requested';
export const CONTRACT_REVISION_RESPONDED = 'contract.revision.responded';
export const CONTRACT_SIGNED = 'contract.signed';
export const CONTRACT_FULLY_SIGNED = 'contract.fully.signed';
export const CONTRACT_EXPIRING = 'contract.expiring';
export const CONTRACT_EXPIRED = 'contract.expired';
export const CONTRACT_CANCELLED = 'contract.cancelled';

// Event Payload Interfaces
export interface OrderCreatedEvent {
  orderId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId?: string;
  supplierName?: string;
  productName: string;
  quantity: number;
  totalValue: number;
  deadline: Date;
  targetSupplierIds?: string[];
}

export interface OrderStatusChangedEvent {
  orderId: string;
  displayId: string;
  brandId: string;
  supplierId?: string;
  previousStatus: string;
  newStatus: string;
  changedById: string;
  changedByName: string;
}

export interface OrderAcceptedEvent {
  orderId: string;
  displayId: string;
  brandId: string;
  supplierId: string;
  supplierName: string;
  acceptedById: string;
}

export interface OrderRejectedEvent {
  orderId: string;
  displayId: string;
  brandId: string;
  supplierId?: string;
  reason?: string;
  rejectedById: string;
}

export interface OrderDeadlineApproachingEvent {
  orderId: string;
  displayId: string;
  brandId: string;
  supplierId?: string;
  deadline: Date;
  hoursRemaining: number;
}

export interface MessageSentEvent {
  messageId: string;
  orderId: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  brandId: string;
  supplierId?: string;
  type: 'TEXT' | 'PROPOSAL';
  content?: string;
}

export interface ProposalSentEvent {
  messageId: string;
  orderId: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  brandId: string;
  supplierId?: string;
  proposedPrice?: number;
  proposedQuantity?: number;
  proposedDeadline?: Date;
}

export interface ProposalRespondedEvent {
  messageId: string;
  orderId: string;
  responderId: string;
  responderName: string;
  proposerId: string;
  status: 'ACCEPTED' | 'REJECTED';
}

export interface CredentialInviteSentEvent {
  credentialId: string;
  brandId: string;
  brandName: string;
  supplierEmail: string;
  supplierName?: string;
}

export interface CredentialStatusChangedEvent {
  credentialId: string;
  brandId: string;
  supplierId?: string;
  supplierName?: string;
  previousStatus: string;
  newStatus: string;
}

export interface CredentialCompletedEvent {
  credentialId: string;
  brandId: string;
  supplierId: string;
  supplierName: string;
}

export interface DocumentExpiringEvent {
  documentId: string;
  companyId: string;
  documentType: string;
  documentName: string;
  expiresAt: Date;
  daysRemaining: number;
}

export interface DocumentExpiredEvent {
  documentId: string;
  companyId: string;
  documentType: string;
  documentName: string;
  expiredAt: Date;
}

export interface PaymentRegisteredEvent {
  paymentId: string;
  orderId: string;
  orderDisplayId: string;
  brandId: string;
  supplierId: string;
  amount: number;
  dueDate: Date;
}

export interface PaymentReceivedEvent {
  paymentId: string;
  orderId: string;
  orderDisplayId: string;
  brandId: string;
  supplierId: string;
  amount: number;
  paidDate: Date;
}

export interface PaymentOverdueEvent {
  paymentId: string;
  orderId: string;
  orderDisplayId: string;
  brandId: string;
  supplierId: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
}

export interface TicketCreatedEvent {
  ticketId: string;
  displayId: string;
  companyId: string;
  createdById: string;
  createdByName: string;
  title: string;
  category: string;
  priority: string;
}

export interface TicketMessageAddedEvent {
  ticketId: string;
  displayId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  isFromSupport: boolean;
  recipientId: string;
}

export interface TicketStatusChangedEvent {
  ticketId: string;
  displayId: string;
  previousStatus: string;
  newStatus: string;
  changedById: string;
  creatorId: string;
}

export interface RelationshipRequestedEvent {
  relationshipId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  initiatedById: string;
}

export interface RelationshipStatusChangedEvent {
  relationshipId: string;
  brandId: string;
  supplierId: string;
  previousStatus: string;
  newStatus: string;
  changedById: string;
}

export interface SupplierInterestExpressedEvent {
  orderId: string;
  orderDisplayId: string;
  brandId: string;
  supplierId: string;
  supplierName: string;
  message?: string;
}

export interface RatingReceivedEvent {
  ratingId: string;
  orderId: string;
  orderDisplayId: string;
  fromCompanyId: string;
  fromCompanyName: string;
  toCompanyId: string;
  score: number;
  comment?: string;
}

export interface SupplierStatusChangedEvent {
  companyId: string;
  companyName: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  adminId: string;
  adminName: string;
}

export interface SystemAnnouncementEvent {
  title: string;
  body: string;
  targetRole?: 'BRAND' | 'SUPPLIER' | 'ALL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
}

export interface PartnershipRequestReceivedEvent {
  requestId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  requestedById: string;
  requestedByName: string;
  message?: string;
}

export interface PartnershipRequestAcceptedEvent {
  requestId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  respondedById: string;
  respondedByName: string;
  relationshipId: string;
}

export interface PartnershipRequestRejectedEvent {
  requestId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  respondedById: string;
  respondedByName: string;
  rejectionReason?: string;
}

export interface PartnershipRequestCancelledEvent {
  requestId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  cancelledById: string;
  cancelledByName: string;
}

// Document Sharing Consent Events
export interface DocumentSharingConsentRevokedEvent {
  relationshipId: string;
  supplierId: string;
  supplierName: string;
  brandId: string;
  brandName: string;
  revokedById: string;
  revokedByName: string;
  reason: string;
  clientIp?: string;
}

export interface SupplierDocumentExpiringForBrandEvent {
  documentId: string;
  supplierId: string;
  supplierName: string;
  brandId: string;
  documentType: string;
  documentName: string;
  expiresAt: Date;
  daysRemaining: number;
}

export interface SupplierDocumentUpdatedEvent {
  documentId: string;
  supplierId: string;
  supplierName: string;
  brandIds: string[];
  documentType: string;
  documentName: string;
  action: 'uploaded' | 'updated';
}

// Code of Conduct Event Interfaces
export interface CodeOfConductUploadedEvent {
  documentId: string;
  brandId: string;
  brandName: string;
  documentTitle: string;
  isRequired: boolean;
  supplierIds: string[];
}

export interface CodeOfConductUpdatedEvent {
  documentId: string;
  brandId: string;
  brandName: string;
  documentTitle: string;
  newVersion: string;
  requiresReacceptance: boolean;
  affectedRelationshipIds: string[];
}

export interface CodeOfConductAcceptedEvent {
  documentId: string;
  acceptanceId: string;
  brandId: string;
  supplierId: string;
  supplierName: string;
  acceptedByName: string;
  version: string;
}

export interface CodeOfConductReminderEvent {
  documentId: string;
  brandId: string;
  brandName: string;
  documentTitle: string;
  relationshipId: string;
  supplierId: string;
  supplierName: string;
}

// Contract Event Interfaces
export interface ContractCreatedEvent {
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  title?: string;
  type: string;
  createdById: string;
  createdByName: string;
}

export interface ContractSentForSignatureEvent {
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  title?: string;
  sentById: string;
  sentByName: string;
  message?: string;
}

export interface ContractRevisionRequestedEvent {
  revisionId: string;
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  requestedById: string;
  requestedByName: string;
  message: string;
}

export interface ContractRevisionRespondedEvent {
  revisionId: string;
  contractId: string;
  displayId: string;
  brandId: string;
  supplierId: string;
  supplierName: string;
  respondedById: string;
  respondedByName: string;
  status: 'ACCEPTED' | 'REJECTED';
  responseNotes?: string;
}

export interface ContractSignedEvent {
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  signedBy: 'BRAND' | 'SUPPLIER';
  signerName: string;
  signerId: string;
}

export interface ContractFullySignedEvent {
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  title?: string;
}

export interface ContractExpiringEvent {
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  title?: string;
  validUntil: Date;
  daysRemaining: number;
}

export interface ContractExpiredEvent {
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  title?: string;
  expiredAt: Date;
}

export interface ContractCancelledEvent {
  contractId: string;
  displayId: string;
  brandId: string;
  brandName: string;
  supplierId: string;
  supplierName: string;
  cancelledById: string;
  cancelledByName: string;
  reason?: string;
}
