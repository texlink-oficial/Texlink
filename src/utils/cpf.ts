/**
 * CPF validation and formatting utilities.
 *
 * Validation uses the standard modulo-11 algorithm for both check digits.
 */

/** Strip all non-numeric characters from a CPF string. */
export function stripCPF(value: string): string {
  return value.replace(/\D/g, '');
}

/** Format a numeric string as XXX.XXX.XXX-XX. */
export function formatCPF(value: string): string {
  const digits = stripCPF(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Validate a CPF using the modulo-11 algorithm.
 *
 * Accepts either raw digits or a formatted string (dots and dash are stripped).
 * Returns `true` when the CPF is structurally valid.
 */
export function validateCPF(cpf: string): boolean {
  const digits = stripCPF(cpf);

  // Must be exactly 11 digits
  if (digits.length !== 11) return false;

  // Reject known invalid patterns (all same digit)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // First check digit (position 10)
  const weights1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * weights1[i];
  }
  let remainder = (sum * 10) % 11;
  const firstCheckDigit = remainder === 10 ? 0 : remainder;

  if (Number(digits[9]) !== firstCheckDigit) return false;

  // Second check digit (position 11)
  const weights2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * weights2[i];
  }
  remainder = (sum * 10) % 11;
  const secondCheckDigit = remainder === 10 ? 0 : remainder;

  if (Number(digits[10]) !== secondCheckDigit) return false;

  return true;
}
