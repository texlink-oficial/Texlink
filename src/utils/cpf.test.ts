import { describe, it, expect } from 'vitest';
import { validateCPF, formatCPF, stripCPF } from './cpf';

describe('CPF Utilities', () => {
  describe('validateCPF', () => {
    it('should return true for a valid CPF (52998224725)', () => {
      expect(validateCPF('52998224725')).toBe(true);
    });

    it('should return true for a valid formatted CPF', () => {
      expect(validateCPF('529.982.247-25')).toBe(true);
    });

    it('should return true for other known valid CPFs', () => {
      expect(validateCPF('11144477735')).toBe(true);
    });

    it('should return false for invalid check digits', () => {
      expect(validateCPF('52998224720')).toBe(false); // wrong last digit
      expect(validateCPF('52998224715')).toBe(false); // wrong second-to-last digit
      expect(validateCPF('12345678901')).toBe(false);
    });

    it('should return false for all-same digits (11111111111)', () => {
      expect(validateCPF('11111111111')).toBe(false);
      expect(validateCPF('00000000000')).toBe(false);
      expect(validateCPF('99999999999')).toBe(false);
      expect(validateCPF('22222222222')).toBe(false);
    });

    it('should return false for wrong length', () => {
      expect(validateCPF('1234567890')).toBe(false);   // 10 digits
      expect(validateCPF('123456789012')).toBe(false);  // 12 digits
      expect(validateCPF('')).toBe(false);
      expect(validateCPF('123')).toBe(false);
    });
  });

  describe('formatCPF', () => {
    it('should format a full 11-digit CPF as XXX.XXX.XXX-XX', () => {
      expect(formatCPF('52998224725')).toBe('529.982.247-25');
    });

    it('should format a partial CPF (3 digits)', () => {
      expect(formatCPF('529')).toBe('529');
    });

    it('should format a partial CPF (4 digits)', () => {
      expect(formatCPF('5299')).toBe('529.9');
    });

    it('should format a partial CPF (7 digits)', () => {
      expect(formatCPF('5299822')).toBe('529.982.2');
    });

    it('should format a partial CPF (10 digits)', () => {
      expect(formatCPF('5299822472')).toBe('529.982.247-2');
    });

    it('should strip non-numeric characters before formatting', () => {
      expect(formatCPF('529.982.247-25')).toBe('529.982.247-25');
    });

    it('should handle empty string', () => {
      expect(formatCPF('')).toBe('');
    });
  });

  describe('stripCPF', () => {
    it('should remove dots and dash from a formatted CPF', () => {
      expect(stripCPF('529.982.247-25')).toBe('52998224725');
    });

    it('should return the same string if already stripped', () => {
      expect(stripCPF('52998224725')).toBe('52998224725');
    });

    it('should remove all non-digit characters', () => {
      expect(stripCPF('abc529def982ghi247jkl25')).toBe('52998224725');
    });

    it('should handle empty string', () => {
      expect(stripCPF('')).toBe('');
    });
  });
});
