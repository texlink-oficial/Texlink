import { IsString, IsNotEmpty } from 'class-validator';

export class ToggleSuperAdminDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
