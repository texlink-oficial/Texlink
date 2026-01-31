import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';

export class UpdateTicketDto {
    @IsOptional()
    @IsEnum(SupportTicketStatus)
    status?: SupportTicketStatus;

    @IsOptional()
    @IsEnum(SupportTicketPriority)
    priority?: SupportTicketPriority;

    @IsOptional()
    @IsUUID()
    assignedToId?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
