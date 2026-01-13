import { IsNumber, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
    @IsNumber()
    amount: number;

    @IsDateString()
    dueDate: string;

    @IsString()
    @IsOptional()
    method?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class UpdatePaymentDto {
    @IsEnum(PaymentStatus)
    @IsOptional()
    status?: PaymentStatus;

    @IsDateString()
    @IsOptional()
    paidDate?: string;

    @IsString()
    @IsOptional()
    proofUrl?: string;
}
