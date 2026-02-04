import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export enum RejectionCategory {
  DEFEITO_COSTURA = 'DEFEITO_COSTURA',
  MEDIDAS_INCORRETAS = 'MEDIDAS_INCORRETAS',
  MANCHAS_SUJEIRA = 'MANCHAS_SUJEIRA',
  AVIAMENTOS_ERRADOS = 'AVIAMENTOS_ERRADOS',
  OUTROS = 'OUTROS',
}

export enum PeriodFilter {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  CUSTOM = 'custom',
}

export class RejectionReportFiltersDto {
  @IsOptional()
  @IsEnum(PeriodFilter)
  period?: PeriodFilter;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  productType?: string;

  @IsOptional()
  @IsEnum(RejectionCategory)
  reasonCategory?: RejectionCategory;
}
