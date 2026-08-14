import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import { PaymentMethod } from '@prisma/client';

export class PaymentAllocationInputDto {
  @IsUUID()
  assessmentId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  paymentNumber!: string;

  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationInputDto)
  allocations?: PaymentAllocationInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  billingPeriodIds?: string[];

  @IsUUID()
  residentId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsUUID()
  proofFileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofUrl?: string;

  @IsOptional()
  @IsUUID()
  chargeTypeId?: string;
}
