import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Reject all same digits (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false;
  // Validate check digits
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) {
      sum += parseInt(digits[i]) * (t + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    const checkDigit = remainder === 10 ? 0 : remainder;
    if (parseInt(digits[t]) !== checkDigit) return false;
  }
  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let t = 0; t < 2; t++) {
    const w = t === 0 ? weights1 : weights2;
    let sum = 0;
    for (let i = 0; i < w.length; i++) {
      sum += parseInt(digits[i]) * w[i];
    }
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(digits[12 + t]) !== checkDigit) return false;
  }
  return true;
}

export function IsDocument(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDocument',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const type = obj.documentType;
          const digits = (value || '').replace(/\D/g, '');
          if (type === 'CPF') return validateCPF(digits);
          return validateCNPJ(digits);
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          return obj.documentType === 'CPF' ? 'CPF inválido' : 'CNPJ inválido';
        },
      },
    });
  };
}
