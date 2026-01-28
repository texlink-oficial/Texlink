import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO para aprovação manual de compliance
 */
export class ApproveComplianceDto {
    @ApiProperty({
        description: 'Notas sobre a aprovação manual',
        example: 'Após análise detalhada, aprovamos o credenciamento considerando o histórico positivo da empresa.',
        maxLength: 1000,
    })
    @IsString({ message: 'Notas devem ser uma string' })
    @IsNotEmpty({ message: 'Notas são obrigatórias' })
    @MaxLength(1000, { message: 'Notas devem ter no máximo 1000 caracteres' })
    notes: string;
}
