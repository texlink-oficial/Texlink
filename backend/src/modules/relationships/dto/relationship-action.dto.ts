import { IsString, IsNotEmpty } from 'class-validator';

export class RelationshipActionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
