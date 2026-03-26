import {
  IsInt,
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCapacityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  dailyCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  currentOccupancy?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  @Type(() => Number)
  activeWorkers?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(24)
  @Type(() => Number)
  hoursPerDay?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];
}
