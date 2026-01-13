import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CompanyType } from '@prisma/client';

export class CreateCompanyDto {
    @IsString()
    @IsNotEmpty()
    legalName: string;

    @IsString()
    @IsOptional()
    tradeName?: string;

    @IsString()
    @IsNotEmpty()
    document: string; // CNPJ or CPF

    @IsEnum(CompanyType)
    type: CompanyType;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    state: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    email?: string;
}
