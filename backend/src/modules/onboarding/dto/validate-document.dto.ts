import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class ValidateDocumentDto {
    @ApiProperty({
        description: 'Se o documento é válido',
        example: true,
    })
    @IsBoolean()
    isValid: boolean;

    @ApiProperty({
        description: 'Notas de validação (motivo de rejeição, etc)',
        example: 'Documento fora da validade',
        required: false,
    })
    @IsString()
    @IsOptional()
    validationNotes?: string;
}
