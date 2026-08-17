import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import { PaymentMethod, UtilityType } from '@prisma/client';

export class CreateUtilityExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  providerName!: string;

  @IsEnum(UtilityType)
  @IsNotEmpty()
  utilityType!: UtilityType;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  expenseDate!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  billingPeriod?: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  receiptFileId?: string;
}
