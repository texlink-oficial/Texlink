import { IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCapacityConfigDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  activeWorkers: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(24)
  hoursPerDay: number;
}
