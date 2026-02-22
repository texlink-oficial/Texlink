import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validate a CNPJ using the modulo-11 algorithm.
 *
 * Accepts either raw 14-digit string or formatted XX.XXX.XXX/XXXX-XX.
 */
export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');

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

@ValidatorConstraint({ name: 'isCNPJ', async: false })
export class IsCNPJConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return true; // Let @IsOptional / @IsNotEmpty handle presence
    return validateCNPJ(value);
  }

  defaultMessage(): string {
    return 'CNPJ inválido. Verifique o número informado.';
  }
}

/**
 * Class-validator decorator that validates a CNPJ field using the modulo-11 algorithm.
 *
 * Usage:
 * ```
 * @IsCNPJ()
 * document: string;
 * ```
 */
export function IsCNPJ(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCNPJConstraint,
    });
  };
}
