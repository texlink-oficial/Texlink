import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';

export class CapabilitiesDto {
  @ApiProperty({
    description: 'Tipos de produtos que a facção produz',
    example: ['Infantil', 'Adulto Feminino', 'Fitness/Activewear'],
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Selecione pelo menos um tipo de produto' })
  productTypes: string[];

  @ApiPropertyOptional({
    description: 'Especialidades da facção',
    example: ['Malha', 'Moletom', 'Estamparia'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiProperty({
    description: 'Capacidade mensal de produção em peças',
    example: 5000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100, { message: 'Capacidade mínima é de 100 peças/mês' })
  monthlyCapacity: number;

  @ApiProperty({
    description: 'Ocupação atual da capacidade (0-100%)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  currentOccupancy: number;
}
