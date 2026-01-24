import { IsString, IsOptional, IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateFavoriteSupplierDto {
    @IsString()
    @IsNotEmpty()
    supplierId: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    priority?: number;
}

export class UpdateFavoriteSupplierDto {
    @IsString()
    @IsOptional()
    notes?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    priority?: number;
}
