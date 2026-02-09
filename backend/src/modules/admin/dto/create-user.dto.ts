import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class AdminCreateUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString({ message: 'Nome é obrigatório' })
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  name: string;

  @IsString({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;

  @IsEnum(UserRole, { message: 'Role deve ser ADMIN, BRAND ou SUPPLIER' })
  role: UserRole;

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsBoolean()
  @IsOptional()
  isCompanyAdmin?: boolean;
}
