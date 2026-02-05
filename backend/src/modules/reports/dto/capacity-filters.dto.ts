import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum CapacityPeriodFilter {
  CURRENT_MONTH = 'current_month',
  NEXT_MONTH = 'next_month',
  QUARTER = 'quarter',
  CUSTOM = 'custom',
}

export class CapacityReportFiltersDto {
  @IsOptional()
  @IsEnum(CapacityPeriodFilter)
  period?: CapacityPeriodFilter;

  @IsOptional()
  @IsString()
  startDate?: string; // ISO date

  @IsOptional()
  @IsString()
  endDate?: string; // ISO date

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  productType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  projectionMonths?: number = 3;
}
