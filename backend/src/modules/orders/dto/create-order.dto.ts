import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { OrderAssignmentType } from '@prisma/client';

export class CreateOrderDto {
    @IsString()
    productType: string;

    @IsString()
    @IsOptional()
    productCategory?: string;

    @IsString()
    productName: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    pricePerUnit: number;

    @IsDateString()
    deliveryDeadline: string;

    @IsString()
    @IsOptional()
    paymentTerms?: string;

    @IsBoolean()
    @IsOptional()
    materialsProvided?: boolean;

    @IsString()
    @IsOptional()
    observations?: string;

    // Assignment type: DIRECT or BIDDING
    @IsEnum(OrderAssignmentType)
    assignmentType: OrderAssignmentType;

    // For DIRECT: single supplier ID
    @IsUUID()
    @IsOptional()
    supplierId?: string;

    // For BIDDING: multiple supplier IDs
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    targetSupplierIds?: string[];
}
