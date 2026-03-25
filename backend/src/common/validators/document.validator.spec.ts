import { validateCPF, validateCNPJ } from './document.validator';

describe('Document Validators', () => {
  describe('validateCPF', () => {
    it('should return true for valid CPFs', () => {
      // Known valid CPFs (check-digit verified)
      expect(validateCPF('52998224725')).toBe(true);
      expect(validateCPF('529.982.247-25')).toBe(true); // formatted
      expect(validateCPF('11144477735')).toBe(true);
      expect(validateCPF('45532945060')).toBe(true);
    });

    it('should return false for invalid CPFs (wrong check digits)', () => {
      expect(validateCPF('52998224720')).toBe(false); // wrong last digit
      expect(validateCPF('52998224715')).toBe(false); // wrong second-to-last digit
      expect(validateCPF('12345678901')).toBe(false);
    });

    it('should return false for CPFs with all same digits', () => {
      expect(validateCPF('11111111111')).toBe(false);
      expect(validateCPF('00000000000')).toBe(false);
      expect(validateCPF('99999999999')).toBe(false);
      expect(validateCPF('22222222222')).toBe(false);
    });

    it('should return false for CPFs with wrong length', () => {
      expect(validateCPF('1234567890')).toBe(false);   // 10 digits
      expect(validateCPF('123456789012')).toBe(false);  // 12 digits
      expect(validateCPF('')).toBe(false);
      expect(validateCPF('123')).toBe(false);
    });
  });

  describe('validateCNPJ', () => {
    it('should return true for valid CNPJs', () => {
      expect(validateCNPJ('11222333000181')).toBe(true);
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true); // formatted
    });

    it('should return false for invalid CNPJs (wrong check digits)', () => {
      expect(validateCNPJ('11222333000182')).toBe(false); // wrong last digit
      expect(validateCNPJ('12345678000100')).toBe(false);
    });

    it('should return false for CNPJs with all same digits', () => {
      expect(validateCNPJ('11111111111111')).toBe(false);
      expect(validateCNPJ('00000000000000')).toBe(false);
      expect(validateCNPJ('99999999999999')).toBe(false);
    });

    it('should return false for CNPJs with wrong length', () => {
      expect(validateCNPJ('1122233300018')).toBe(false);    // 13 digits
      expect(validateCNPJ('112223330001811')).toBe(false);   // 15 digits
      expect(validateCNPJ('')).toBe(false);
    });
  });
});
