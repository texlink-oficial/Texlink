import { IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateTemplateDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    productType: string;

    @IsString()
    @IsOptional()
    productCategory?: string;

    @IsString()
    @IsNotEmpty()
    productName: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    materialsProvided?: boolean;

    @IsNumber()
    @IsOptional()
    defaultPrice?: number;

    @IsString()
    @IsOptional()
    observations?: string;
}

export class UpdateTemplateDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    productType?: string;

    @IsString()
    @IsOptional()
    productCategory?: string;

    @IsString()
    @IsOptional()
    productName?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    materialsProvided?: boolean;

    @IsNumber()
    @IsOptional()
    defaultPrice?: number;

    @IsString()
    @IsOptional()
    observations?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
