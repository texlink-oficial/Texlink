import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { CompanyRole } from '@prisma/client';

export class AddUserToCompanyDto {
  @IsString({ message: 'userId é obrigatório' })
  userId: string;

  @IsEnum(CompanyRole, { message: 'Role inválido' })
  @IsOptional()
  companyRole?: CompanyRole;

  @IsBoolean()
  @IsOptional()
  isCompanyAdmin?: boolean;
}
