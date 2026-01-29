import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UploadDocumentDto {
    @ApiProperty({
        description: 'Tipo do documento (alvara, certificacao, etc)',
        example: 'alvara_funcionamento',
    })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        description: 'Nome exibido do documento',
        example: 'Alvará de Funcionamento',
        required: false,
    })
    @IsString()
    @IsOptional()
    name?: string;
}
