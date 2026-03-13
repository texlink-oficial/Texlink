import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  IsUUID,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { OrderAssignmentType } from '@prisma/client';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return false;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }
  defaultMessage() {
    return 'A data de entrega não pode ser no passado';
  }
}

export class CreateOrderDto {
  @IsString()
  productType: string;

  @IsString()
  @IsOptional()
  productCategory?: string;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  op?: string;

  @IsOptional()
  @IsString()
  artigo?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  pricePerUnit: number;

  @IsDateString()
  @Validate(IsFutureDateConstraint)
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

  @IsBoolean()
  @IsOptional()
  protectTechnicalSheet?: boolean;

  // Assignment type: DIRECT, BIDDING or HYBRID

  @IsEnum(OrderAssignmentType)
  assignmentType: OrderAssignmentType;

  // For DIRECT: single supplier ID
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  // For BIDDING/HYBRID: multiple supplier IDs (optional for HYBRID)

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  targetSupplierIds?: string[];
}
