import { IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { RelationshipStatus } from '@prisma/client';

export class UpdateRelationshipDto {
  @IsEnum(RelationshipStatus)
  @IsOptional()
  status?: RelationshipStatus;

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
