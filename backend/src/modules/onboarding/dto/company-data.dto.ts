import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class CompanyDataDto {
  @ApiProperty({
    description: 'Interesse principal ao se cadastrar na plataforma',
    example: 'Aumentar faturamento',
    enum: [
      'Aumentar faturamento',
      'Diversificar clientes',
      'Otimizar capacidade ociosa',
      'Crescer o negócio',
      'Outros',
    ],
  })
  @IsString()
  @IsIn([
    'Aumentar faturamento',
    'Diversificar clientes',
    'Otimizar capacidade ociosa',
    'Crescer o negócio',
    'Outros',
  ])
  interesse: string;

  @ApiProperty({
    description: 'Faturamento mensal desejado em reais',
    example: 50000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  faturamentoDesejado: number;

  @ApiProperty({
    description: 'Nível de maturidade na gestão',
    example: 'intermediario',
    enum: ['iniciante', 'basico', 'intermediario', 'avancado'],
  })
  @IsString()
  @IsIn(['iniciante', 'basico', 'intermediario', 'avancado'])
  maturidadeGestao: string;

  @ApiProperty({
    description: 'Número de colaboradores da empresa',
    example: 15,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  qtdColaboradores: number;

  @ApiProperty({
    description: 'Tempo de atuação no mercado',
    example: '5 a 10 anos',
    enum: [
      'Menos de 1 ano',
      '1 a 3 anos',
      '3 a 5 anos',
      '5 a 10 anos',
      'Mais de 10 anos',
    ],
  })
  @IsString()
  @IsIn([
    'Menos de 1 ano',
    '1 a 3 anos',
    '3 a 5 anos',
    '5 a 10 anos',
    'Mais de 10 anos',
  ])
  tempoMercado: string;

  @ApiPropertyOptional({
    description: 'Informações adicionais sobre o interesse',
    example: 'Buscando parcerias de longo prazo',
  })
  @IsOptional()
  @IsString()
  outrosDetalhes?: string;
}
