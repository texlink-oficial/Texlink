import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class GenerateContractDto {
    @ApiProperty({
        description: 'Termos específicos do contrato (opcional)',
        example: { paymentTerms: '30 dias', penaltyRate: '0.5%' },
        required: false,
    })
    @IsObject()
    @IsOptional()
    terms?: Record<string, any>;
}
