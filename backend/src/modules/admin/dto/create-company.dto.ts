import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CompanyType } from '@prisma/client';
import { IsDocument } from '../../../common/validators/document.validator';

export class AdminCreateCompanyDto {
  @IsString({ message: 'Razão social é obrigatória' })
  @MinLength(3, { message: 'Razão social deve ter pelo menos 3 caracteres' })
  legalName: string;

  @IsString()
  @IsOptional()
  tradeName?: string;

  @IsIn(['CNPJ', 'CPF'], { message: 'documentType deve ser CNPJ ou CPF' })
  @IsOptional()
  documentType?: string = 'CNPJ';

  @IsString({ message: 'Documento é obrigatório' })
  @IsDocument({ message: 'Documento inválido. Verifique o número informado.' })
  document: string;

  @IsEnum(CompanyType, { message: 'Tipo deve ser BRAND ou SUPPLIER' })
  type: CompanyType;

  @IsString({ message: 'Cidade é obrigatória' })
  city: string;

  @IsString({ message: 'Estado é obrigatório' })
  state: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  ownerUserId?: string;
}
