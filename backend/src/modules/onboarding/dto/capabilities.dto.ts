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
    description: 'Número de costureiros ativos',
    example: 12,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Informe pelo menos 1 costureiro' })
  activeWorkers: number;

  @ApiProperty({
    description: 'Horas de trabalho por dia',
    example: 8,
    minimum: 1,
    maximum: 24,
  })
  @IsNumber()
  @Min(1)
  @Max(24)
  hoursPerDay: number;

  @ApiPropertyOptional({
    description: 'Capacidade diaria em minutos (calculado automaticamente)',
    example: 5760,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyCapacity?: number;

  @ApiPropertyOptional({
    description: 'Ocupação atual da capacidade (0-100%)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  currentOccupancy?: number;
}
