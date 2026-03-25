import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CompanyType } from '@prisma/client';
import { IsDocument } from '../../../common/validators/document.validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @IsString()
  @IsOptional()
  tradeName?: string;

  @IsIn(['CNPJ', 'CPF'], { message: 'documentType deve ser CNPJ ou CPF' })
  @IsOptional()
  documentType?: string = 'CNPJ';

  @IsString()
  @IsNotEmpty()
  @IsDocument({ message: 'Documento inválido. Verifique o número informado.' })
  document: string; // CNPJ or CPF

  @IsEnum(CompanyType)
  type: CompanyType;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
