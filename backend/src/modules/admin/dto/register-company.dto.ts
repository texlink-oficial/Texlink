import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  MinLength,
} from 'class-validator';
import { CompanyType } from '@prisma/client';

export class AdminRegisterCompanyDto {
  // Owner user fields
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @IsString()
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  userName: string;

  @IsOptional()
  @IsString()
  userPhone?: string;

  // Company fields
  @IsString({ message: 'Razão social é obrigatória' })
  @MinLength(3, { message: 'Razão social deve ter pelo menos 3 caracteres' })
  legalName: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsString({ message: 'CNPJ é obrigatório' })
  document: string;

  @IsEnum(CompanyType, { message: 'Tipo deve ser BRAND ou SUPPLIER' })
  type: CompanyType;

  @IsString({ message: 'Cidade é obrigatória' })
  city: string;

  @IsString({ message: 'Estado é obrigatório' })
  state: string;

  @IsOptional()
  @IsString()
  companyPhone?: string;

  @IsOptional()
  @IsString()
  companyEmail?: string;

  // Qualification fields
  @IsArray({ message: 'Tipos de produto são obrigatórios' })
  @IsString({ each: true })
  productTypes: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsString()
  tempoMercado?: string;

  // Supplier-only
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  machines?: string[];

  @IsOptional()
  @IsNumber({}, { message: 'Número de costureiras deve ser numérico' })
  qtdCostureiras?: number;

  // Brand-only
  @IsOptional()
  @IsNumber({}, { message: 'Volume mensal deve ser numérico' })
  monthlyVolume?: number;
}
