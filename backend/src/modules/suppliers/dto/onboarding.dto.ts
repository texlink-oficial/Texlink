import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';

// Phase 1: Basic company data (handled by Companies module)

// Phase 2: Business Qualification
export class OnboardingPhase2Dto {
  @IsString()
  @IsOptional()
  interesse?: string; // Motivation to join platform

  @IsNumber()
  @IsOptional()
  faturamentoDesejado?: number; // Desired monthly revenue

  @IsString()
  @IsOptional()
  maturidadeGestao?: string; // Management maturity level

  @IsNumber()
  @IsOptional()
  qtdColaboradores?: number; // Number of employees

  @IsString()
  @IsOptional()
  tempoMercado?: string; // Time in market
}

// Phase 3: Production Capacity
export class OnboardingPhase3Dto {
  @IsArray()
  @IsString({ each: true })
  productTypes: string[]; // e.g., ["Infantil", "Adulto", "Fitness"]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[]; // e.g., ["Jeans", "Malha", "Tricô"]

  @IsNumber()
  dailyCapacity: number; // minutes per day

  @IsNumber()
  @IsOptional()
  activeWorkers?: number; // number of active seamstresses

  @IsNumber()
  @IsOptional()
  hoursPerDay?: number; // working hours per day

  @IsNumber()
  @IsOptional()
  currentOccupancy?: number; // current occupancy %

  @IsBoolean()
  @IsOptional()
  onboardingComplete?: boolean;
}
