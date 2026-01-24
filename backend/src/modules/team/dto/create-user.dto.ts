import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsBoolean } from 'class-validator';
import { CompanyRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  name: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @IsEnum(CompanyRole, { message: 'Role inválido' })
  @IsOptional()
  companyRole?: CompanyRole = CompanyRole.VIEWER;

  @IsBoolean()
  @IsOptional()
  isCompanyAdmin?: boolean = false;
}
