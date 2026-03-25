/**
 * Unified document utilities for CPF and CNPJ.
 */

import { formatCPF, validateCPF } from './cpf';
import { formatCNPJ, validateCNPJ } from './cnpj';

export type DocumentType = 'CNPJ' | 'CPF';

/** Strip all non-numeric characters from a document string. */
export function stripDocument(value: string): string {
  return value.replace(/\D/g, '');
}

/** Format a document string according to its type. */
export function formatDocument(value: string | undefined | null, type?: DocumentType): string {
  if (!value) return '-';
  const resolved = type || detectDocumentType(value);
  return resolved === 'CPF' ? formatCPF(value) : formatCNPJ(value);
}

/** Validate a document string according to its type. */
export function validateDocument(value: string, type: DocumentType): boolean {
  return type === 'CPF' ? validateCPF(value) : validateCNPJ(value);
}

/**
 * Detect document type based on digit count.
 * 11 digits = CPF, otherwise CNPJ.
 */
export function detectDocumentType(value: string): DocumentType {
  const digits = stripDocument(value);
  return digits.length <= 11 ? 'CPF' : 'CNPJ';
}

/** Get the user-facing label for a document type. */
export function getDocumentLabel(type?: DocumentType): string {
  if (!type) return 'Documento';
  return type === 'CPF' ? 'CPF' : 'CNPJ';
}
