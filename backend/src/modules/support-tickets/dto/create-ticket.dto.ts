import { IsString, IsOptional, IsEnum, IsArray, MaxLength } from 'class-validator';
import { SupportTicketCategory, SupportTicketPriority } from '@prisma/client';

export class CreateTicketDto {
    @IsString()
    @MaxLength(200)
    title: string;

    @IsString()
    @MaxLength(5000)
    description: string;

    @IsEnum(SupportTicketCategory)
    category: SupportTicketCategory;

    @IsOptional()
    @IsEnum(SupportTicketPriority)
    priority?: SupportTicketPriority;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachments?: string[];
}
