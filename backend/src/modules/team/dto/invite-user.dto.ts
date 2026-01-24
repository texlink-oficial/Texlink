import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { CompanyRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsEnum(CompanyRole, { message: 'Role inválido' })
  @IsOptional()
  companyRole?: CompanyRole = CompanyRole.VIEWER;

  @IsOptional()
  @IsString()
  message?: string; // Mensagem personalizada no convite
}
