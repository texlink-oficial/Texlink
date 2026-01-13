import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateRatingDto {
    @IsNumber()
    @Min(1)
    @Max(5)
    score: number;

    @IsString()
    @IsOptional()
    comment?: string;
}
