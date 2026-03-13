import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsIn,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { IsCNPJ } from '../../../common/validators/cnpj.validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn([UserRole.BRAND, UserRole.SUPPLIER], {
    message: 'Role deve ser BRAND ou SUPPLIER',
  })
  role: UserRole;

  @IsString()
  @IsNotEmpty({ message: 'Razao social e obrigatoria' })
  @MinLength(2, { message: 'Razao social deve ter pelo menos 2 caracteres' })
  legalName: string;

  @IsString()
  @IsOptional()
  tradeName?: string;

  @IsString()
  @IsOptional()
  @IsCNPJ({ message: 'CNPJ inválido. Verifique o número informado.' })
  document?: string; // CNPJ/CPF

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  invitationToken?: string;
}
