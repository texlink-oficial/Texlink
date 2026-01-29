import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SignContractDto {
    @ApiProperty({
        description: 'Confirmação de aceite dos termos',
        example: true,
    })
    @IsBoolean()
    accepted: boolean;
}
