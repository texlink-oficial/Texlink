import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
    @IsEnum(MessageType)
    type: MessageType;

    @IsString()
    @IsOptional()
    content?: string;

    // Proposal data (only for PROPOSAL type)
    @IsNumber()
    @IsOptional()
    proposedPrice?: number;

    @IsNumber()
    @IsOptional()
    proposedQuantity?: number;

    @IsDateString()
    @IsOptional()
    proposedDeadline?: string;
}
