import { IsString, IsNotEmpty, MaxLength, IsIn, IsOptional } from 'class-validator';

export class CreateCompanyNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsString()
  @IsIn(['GERAL', 'FINANCEIRO', 'OPERACIONAL', 'COMERCIAL', 'PENDENCIA', 'ALERTA'])
  @IsOptional()
  category?: string = 'GERAL';
}
