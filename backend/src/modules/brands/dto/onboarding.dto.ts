import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';

// Phase 2: Business Qualification (adapted for brands)
export class BrandOnboardingPhase2Dto {
  @IsString()
  @IsOptional()
  objetivo?: string; // Objective on the platform

  @IsNumber()
  @IsOptional()
  volumeMensal?: number; // Desired monthly order volume (pieces)

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

// Phase 3: Product Needs
export class BrandOnboardingPhase3Dto {
  @IsArray()
  @IsString({ each: true })
  productTypes: string[]; // e.g., ["Infantil", "Adulto Feminino", "Fitness"]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[]; // e.g., ["Jeans", "Malha", "Tricô"]

  @IsNumber()
  monthlyVolume: number; // desired pieces per month

  @IsBoolean()
  @IsOptional()
  onboardingComplete?: boolean;
}
