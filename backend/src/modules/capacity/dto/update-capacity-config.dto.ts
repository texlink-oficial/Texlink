import { IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateCapacityConfigDto {
  @IsInt()
  @Min(1)
  @Max(9999)
  activeWorkers: number;

  @IsNumber()
  @Min(1)
  @Max(24)
  hoursPerDay: number;
}
