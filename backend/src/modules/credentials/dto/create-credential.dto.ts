import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsIn,
  Length,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsDocument } from '../../../common/validators/document.validator';

/**
 * DTO para criação de um novo credenciamento de facção
 */
export class CreateCredentialDto {
  @ApiPropertyOptional({
    description: 'Tipo de documento: CNPJ ou CPF',
    example: 'CNPJ',
    default: 'CNPJ',
    enum: ['CNPJ', 'CPF'],
  })
  @IsIn(['CNPJ', 'CPF'], { message: 'documentType deve ser CNPJ ou CPF' })
  @IsOptional()
  documentType?: string = 'CNPJ';

  @ApiProperty({
    description: 'CNPJ ou CPF da facção (apenas números ou formatado)',
    example: '12.345.678/0001-90',
  })
  @IsString()
  @IsNotEmpty({ message: 'CNPJ/CPF é obrigatório' })
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  @IsDocument({ message: 'Documento inválido. Verifique o número informado.' })
  cnpj: string;

  @ApiProperty({
    description: 'Nome do contato principal na facção',
    example: 'João Silva',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome do contato é obrigatório' })
  @Length(2, 100, {
    message: 'Nome do contato deve ter entre 2 e 100 caracteres',
  })
  contactName: string;

  @ApiProperty({
    description: 'Email do contato principal',
    example: 'joao@faccao.com.br',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  contactEmail: string;

  @ApiProperty({
    description: 'Telefone do contato (formato brasileiro)',
    example: '(11) 99999-9999',
  })
  @IsString()
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  @Matches(/^(\d{10}|\d{11})$/, {
    message: 'Telefone deve ter 10 ou 11 dígitos (DDD + número)',
  })
  contactPhone: string;

  @ApiPropertyOptional({
    description: 'WhatsApp do contato (se diferente do telefone)',
    example: '(11) 99999-9999',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.replace(/\D/g, '') || undefined)
  @Matches(/^(\d{10}|\d{11})$/, {
    message: 'WhatsApp deve ter 10 ou 11 dígitos',
  })
  contactWhatsapp?: string;

  @ApiPropertyOptional({
    description: 'Nome fantasia da facção',
    example: 'Confecções ABC',
  })
  @IsOptional()
  @IsString()
  @Length(2, 150, {
    message: 'Nome fantasia deve ter entre 2 e 150 caracteres',
  })
  tradeName?: string;

  @ApiPropertyOptional({
    description: 'Código interno da marca para esta facção',
    example: 'FAC-001',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50, {
    message: 'Código interno deve ter no máximo 50 caracteres',
  })
  internalCode?: string;

  @ApiPropertyOptional({
    description: 'Categoria/segmento da facção',
    example: 'Jeans',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50, {
    message: 'Categoria deve ter no máximo 50 caracteres',
  })
  category?: string;

  @ApiPropertyOptional({
    description: 'Observações internas sobre a facção',
    example: 'Especialista em acabamento premium',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000, {
    message: 'Notas devem ter no máximo 1000 caracteres',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Prioridade do credenciamento (menor = maior prioridade)',
    example: 0,
    default: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'Prioridade deve ser um número inteiro' })
  @Min(0, { message: 'Prioridade mínima é 0' })
  @Max(100, { message: 'Prioridade máxima é 100' })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 0))
  priority?: number = 0;
}
