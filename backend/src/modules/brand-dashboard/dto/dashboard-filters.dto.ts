import { IsOptional, IsEnum, IsDateString, IsString, IsUUID } from 'class-validator';

export enum PeriodFilter {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  CUSTOM = 'custom',
}

export class DashboardFiltersDto {
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
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  productType?: string;
}

export class SupplierRankingFiltersDto extends DashboardFiltersDto {
  @IsOptional()
  @IsString()
  sortBy?: 'deadlineCompliance' | 'qualityScore' | 'volume' | 'avgCost';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
