import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreatePaymentPresetDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    terms: string;

    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}

export class UpdatePaymentPresetDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    terms?: string;

    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}
