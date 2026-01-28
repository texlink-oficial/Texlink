import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO para rejeição manual de compliance
 */
export class RejectComplianceDto {
    @ApiProperty({
        description: 'Motivo principal da rejeição',
        example: 'Histórico de inadimplência',
        maxLength: 200,
    })
    @IsString({ message: 'Motivo deve ser uma string' })
    @IsNotEmpty({ message: 'Motivo é obrigatório' })
    @MaxLength(200, { message: 'Motivo deve ter no máximo 200 caracteres' })
    reason: string;

    @ApiProperty({
        description: 'Notas detalhadas sobre a rejeição',
        example: 'A empresa possui múltiplas negativações ativas e um histórico de processos trabalhistas não resolvidos.',
        maxLength: 1000,
    })
    @IsString({ message: 'Notas devem ser uma string' })
    @IsNotEmpty({ message: 'Notas são obrigatórias' })
    @MaxLength(1000, { message: 'Notas devem ter no máximo 1000 caracteres' })
    notes: string;
}
