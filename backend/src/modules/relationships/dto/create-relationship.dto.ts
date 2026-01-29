import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateRelationshipDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsOptional()
  internalCode?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}
