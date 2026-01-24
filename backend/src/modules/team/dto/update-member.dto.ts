import { IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyRole, Permission } from '@prisma/client';

export class PermissionOverrideDto {
  @IsEnum(Permission)
  permission: Permission;

  @IsBoolean()
  granted: boolean; // true = conceder, false = negar
}

export class UpdateMemberDto {
  @IsEnum(CompanyRole, { message: 'Role inválido' })
  @IsOptional()
  companyRole?: CompanyRole;

  @IsBoolean()
  @IsOptional()
  isCompanyAdmin?: boolean;
}

export class UpdateMemberPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  @IsOptional()
  permissionOverrides?: PermissionOverrideDto[];

  @IsBoolean()
  @IsOptional()
  clearOverrides?: boolean; // Se true, remove todos os overrides
}
