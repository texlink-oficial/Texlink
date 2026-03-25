import { describe, it, expect } from 'vitest';
import { detectDocumentType, formatDocument, validateDocument, stripDocument, getDocumentLabel } from './document';

describe('Document Utilities', () => {
  describe('detectDocumentType', () => {
    it('should return CPF for 11-digit strings', () => {
      expect(detectDocumentType('52998224725')).toBe('CPF');
    });

    it('should return CPF for formatted CPF strings', () => {
      expect(detectDocumentType('529.982.247-25')).toBe('CPF');
    });

    it('should return CNPJ for 14-digit strings', () => {
      expect(detectDocumentType('11222333000181')).toBe('CNPJ');
    });

    it('should return CNPJ for formatted CNPJ strings', () => {
      expect(detectDocumentType('11.222.333/0001-81')).toBe('CNPJ');
    });

    it('should return CPF for strings with fewer than 11 digits', () => {
      expect(detectDocumentType('12345')).toBe('CPF');
    });

    it('should return CNPJ for strings with more than 11 digits', () => {
      expect(detectDocumentType('123456789012')).toBe('CNPJ');
    });
  });

  describe('formatDocument', () => {
    it('should format a CPF when type is CPF', () => {
      expect(formatDocument('52998224725', 'CPF')).toBe('529.982.247-25');
    });

    it('should format a CNPJ when type is CNPJ', () => {
      expect(formatDocument('11222333000181', 'CNPJ')).toBe('11.222.333/0001-81');
    });

    it('should auto-detect CPF type when not provided', () => {
      expect(formatDocument('52998224725')).toBe('529.982.247-25');
    });

    it('should auto-detect CNPJ type when not provided', () => {
      expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    });

    it('should return "-" for null/undefined values', () => {
      expect(formatDocument(null)).toBe('-');
      expect(formatDocument(undefined)).toBe('-');
    });
  });

  describe('validateDocument', () => {
    it('should validate a valid CPF', () => {
      expect(validateDocument('52998224725', 'CPF')).toBe(true);
    });

    it('should reject an invalid CPF', () => {
      expect(validateDocument('12345678901', 'CPF')).toBe(false);
    });

    it('should validate a valid CNPJ', () => {
      expect(validateDocument('11222333000181', 'CNPJ')).toBe(true);
    });

    it('should reject an invalid CNPJ', () => {
      expect(validateDocument('12345678000100', 'CNPJ')).toBe(false);
    });
  });

  describe('stripDocument', () => {
    it('should strip non-numeric characters from CPF', () => {
      expect(stripDocument('529.982.247-25')).toBe('52998224725');
    });

    it('should strip non-numeric characters from CNPJ', () => {
      expect(stripDocument('11.222.333/0001-81')).toBe('11222333000181');
    });
  });

  describe('getDocumentLabel', () => {
    it('should return "CPF" for CPF type', () => {
      expect(getDocumentLabel('CPF')).toBe('CPF');
    });

    it('should return "CNPJ" for CNPJ type', () => {
      expect(getDocumentLabel('CNPJ')).toBe('CNPJ');
    });

    it('should return "Documento" when no type is provided', () => {
      expect(getDocumentLabel()).toBe('Documento');
    });
  });
});
