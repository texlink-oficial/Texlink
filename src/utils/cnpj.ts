/**
 * CNPJ validation and formatting utilities.
 *
 * Validation uses the standard modulo-11 algorithm for both check digits.
 */

/** Strip all non-numeric characters from a CNPJ string. */
export function stripCNPJ(value: string): string {
  return value.replace(/\D/g, '');
}

/** Format a numeric string as XX.XXX.XXX/XXXX-XX. */
export function formatCNPJ(value: string): string {
  const digits = stripCNPJ(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Validate a CNPJ using the modulo-11 algorithm.
 *
 * Accepts either raw digits or a formatted string (dots, slash, dash are stripped).
 * Returns `true` when the CNPJ is structurally valid.
 */
export function validateCNPJ(cnpj: string): boolean {
  const digits = stripCNPJ(cnpj);

  // Must be exactly 14 digits
  if (digits.length !== 14) return false;

  // Reject known invalid patterns (all same digit)
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // First check digit (position 13)
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const firstCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (Number(digits[12]) !== firstCheckDigit) return false;

  // Second check digit (position 14)
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(digits[i]) * weights2[i];
  }
  remainder = sum % 11;
  const secondCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (Number(digits[13]) !== secondCheckDigit) return false;

  return true;
}
