import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminUpdateCompanyDto {
  @IsString()
  @MinLength(3, { message: 'Razão social deve ter pelo menos 3 caracteres' })
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  tradeName?: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
