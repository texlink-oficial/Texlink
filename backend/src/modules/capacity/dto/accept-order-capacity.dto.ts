import { IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class AcceptOrderCapacityDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0.1)
  avgTimePerPiece: number;

  @IsDateString()
  plannedStartDate: string;
}
