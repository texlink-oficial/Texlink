import { IsString, IsInt, IsOptional, IsEnum, IsArray, ValidateNested, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewType, ReviewResult } from '@prisma/client';

// DTO para criar uma revisão de pedido
export class CreateReviewDto {
    @IsEnum(ReviewType)
    type: ReviewType;

    @IsInt()
    @Min(1)
    totalQuantity: number;

    @IsInt()
    @Min(0)
    approvedQuantity: number;

    @IsInt()
    @Min(0)
    rejectedQuantity: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    secondQualityQuantity?: number;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RejectedItemDto)
    @IsOptional()
    rejectedItems?: RejectedItemDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SecondQualityItemDto)
    @IsOptional()
    secondQualityItems?: SecondQualityItemDto[];
}

// DTO para item reprovado
export class RejectedItemDto {
    @IsString()
    reason: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsString()
    @IsOptional()
    defectDescription?: string;

    @IsBoolean()
    @IsOptional()
    requiresRework?: boolean;
}

// DTO para item de segunda qualidade
export class SecondQualityItemDto {
    @IsInt()
    @Min(1)
    quantity: number;

    @IsString()
    defectType: string;

    @IsString()
    @IsOptional()
    defectDescription?: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    discountPercentage?: number;
}

// DTO para criar pedido filho (retrabalho)
export class CreateChildOrderDto {
    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @Min(1)
    quantity: number;

    @IsString()
    @IsOptional()
    observations?: string;

    @IsString()
    @IsOptional()
    deliveryDeadline?: string;
}

// DTO para atualizar item de segunda qualidade
export class UpdateSecondQualityItemDto {
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    discountPercentage?: number;
}
