import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class SupplierFilterDto {
    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    productTypes?: string[];

    @IsNumber()
    @IsOptional()
    minCapacity?: number;

    @IsNumber()
    @IsOptional()
    maxCapacity?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    specialties?: string[];

    @IsNumber()
    @IsOptional()
    minRating?: number;
}
