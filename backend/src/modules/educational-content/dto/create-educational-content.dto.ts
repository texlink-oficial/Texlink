import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EducationalContentType,
  EducationalContentCategory,
} from '@prisma/client';

export class CreateEducationalContentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(EducationalContentType)
  contentType: EducationalContentType;

  @IsUrl()
  contentUrl: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsEnum(EducationalContentCategory)
  category: EducationalContentCategory;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  displayOrder?: number;
}
