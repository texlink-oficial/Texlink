import {
    IsString,
    IsNotEmpty,
    IsEmail,
    IsOptional,
    IsEnum,
    Matches,
    MinLength,
    MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Canais de envio do convite
 */
export enum InvitationChannel {
    EMAIL = 'EMAIL',
    WHATSAPP = 'WHATSAPP',
    BOTH = 'BOTH',
}

/**
 * DTO para convidar um novo fornecedor (facção)
 *
 * A marca preenche os dados básicos e o convite é enviado
 * via email e/ou WhatsApp para a facção completar o cadastro.
 */
export class InviteSupplierDto {
    @ApiProperty({
        description: 'CNPJ da facção (apenas números ou formatado)',
        example: '12.345.678/0001-90',
    })
    @IsString()
    @IsNotEmpty({ message: 'CNPJ é obrigatório' })
    @Transform(({ value }) => value?.replace(/\D/g, ''))
    @Matches(/^\d{14}$/, { message: 'CNPJ deve conter 14 dígitos' })
    cnpj: string;

    @ApiProperty({
        description: 'Nome do contato principal',
        example: 'Maria Silva',
    })
    @IsString()
    @IsNotEmpty({ message: 'Nome do contato é obrigatório' })
    @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
    @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
    contactName: string;

    @ApiProperty({
        description: 'Email de contato',
        example: 'maria@faccao.com.br',
    })
    @IsEmail({}, { message: 'Email inválido' })
    @IsNotEmpty({ message: 'Email é obrigatório' })
    contactEmail: string;

    @ApiProperty({
        description: 'Telefone de contato (apenas números)',
        example: '11999998888',
    })
    @IsString()
    @IsNotEmpty({ message: 'Telefone é obrigatório' })
    @Transform(({ value }) => value?.replace(/\D/g, ''))
    @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos' })
    contactPhone: string;

    @ApiPropertyOptional({
        description: 'WhatsApp (se diferente do telefone)',
        example: '11999998888',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.replace(/\D/g, '') || undefined)
    @Matches(/^\d{10,11}$/, { message: 'WhatsApp deve ter 10 ou 11 dígitos' })
    contactWhatsapp?: string;

    @ApiPropertyOptional({
        description: 'Mensagem personalizada para o convite',
        example: 'Olá! Gostaria de convidá-los para fazer parte da nossa rede...',
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000, { message: 'Mensagem deve ter no máximo 1000 caracteres' })
    customMessage?: string;

    @ApiProperty({
        description: 'Canal de envio do convite',
        enum: InvitationChannel,
        default: InvitationChannel.EMAIL,
    })
    @IsEnum(InvitationChannel, { message: 'Canal de envio inválido' })
    sendVia: InvitationChannel = InvitationChannel.EMAIL;

    @ApiPropertyOptional({
        description: 'Código interno da marca para referência',
        example: 'FAC-001',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50, { message: 'Código interno deve ter no máximo 50 caracteres' })
    internalCode?: string;

    @ApiPropertyOptional({
        description: 'Observações internas sobre o fornecedor',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'Observações devem ter no máximo 500 caracteres' })
    notes?: string;
}

/**
 * Resposta da criação de convite
 */
export class InviteSupplierResponseDto {
    @ApiProperty({ description: 'ID do credenciamento criado' })
    id: string;

    @ApiProperty({ description: 'CNPJ formatado' })
    cnpj: string;

    @ApiPropertyOptional({ description: 'Razão social (se validado)' })
    legalName?: string;

    @ApiProperty({ description: 'Status do convite' })
    status: string;

    @ApiProperty({ description: 'Mensagem de confirmação' })
    message: string;

    @ApiProperty({ description: 'Data de expiração do convite' })
    expiresAt: Date;
}

/**
 * Item da lista de convites
 */
export class InvitationListItemDto {
    @ApiProperty({ description: 'ID do credenciamento' })
    id: string;

    @ApiProperty({ description: 'CNPJ formatado' })
    cnpj: string;

    @ApiPropertyOptional({ description: 'Razão social' })
    legalName?: string;

    @ApiPropertyOptional({ description: 'Nome fantasia' })
    tradeName?: string;

    @ApiProperty({ description: 'Nome do contato' })
    contactName: string;

    @ApiProperty({ description: 'Email do contato' })
    contactEmail: string;

    @ApiProperty({ description: 'Telefone do contato' })
    contactPhone: string;

    @ApiPropertyOptional({ description: 'WhatsApp' })
    contactWhatsapp?: string;

    @ApiProperty({ description: 'Status do credenciamento' })
    status: string;

    @ApiPropertyOptional({ description: 'Código interno' })
    internalCode?: string;

    @ApiProperty({ description: 'Data de criação' })
    createdAt: Date;

    @ApiPropertyOptional({ description: 'Data de expiração' })
    expiresAt?: Date;

    @ApiPropertyOptional({ description: 'Data do último convite enviado' })
    lastInvitationSentAt?: Date;

    @ApiProperty({ description: 'Se pode reenviar o convite' })
    canResend: boolean;
}

/**
 * DTO para reenviar convite
 */
export class ResendInvitationDto {
    @ApiPropertyOptional({
        description: 'Canal de reenvio (se diferente do original)',
        enum: InvitationChannel,
    })
    @IsOptional()
    @IsEnum(InvitationChannel)
    sendVia?: InvitationChannel;

    @ApiPropertyOptional({
        description: 'Nova mensagem personalizada',
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    customMessage?: string;
}
