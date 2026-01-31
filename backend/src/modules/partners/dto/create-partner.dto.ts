import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, IsEmail, IsUrl, Min } from 'class-validator';
import { PartnerCategory } from '@prisma/client';

export class CreatePartnerDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsUrl()
    logoUrl?: string;

    @IsUrl()
    website: string;

    @IsEnum(PartnerCategory)
    category: PartnerCategory;

    @IsArray()
    @IsString({ each: true })
    benefits: string[];

    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @IsOptional()
    @IsString()
    contactPhone?: string;

    @IsOptional()
    @IsString()
    discountCode?: string;

    @IsOptional()
    @IsString()
    discountInfo?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    displayOrder?: number;
}
