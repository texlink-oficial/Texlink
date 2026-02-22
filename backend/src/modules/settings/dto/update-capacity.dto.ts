import {
  IsInt,
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class UpdateCapacityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyCapacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  currentOccupancy?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  activeWorkers?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(24)
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
