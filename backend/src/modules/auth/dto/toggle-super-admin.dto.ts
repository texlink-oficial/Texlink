import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ToggleSuperAdminDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsUUID()
  @IsOptional()
  targetUserId?: string;
}
