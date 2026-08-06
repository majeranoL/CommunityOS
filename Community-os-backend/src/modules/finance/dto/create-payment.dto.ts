import {
  IsDateString,
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

import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  paymentNumber!: string;

  @IsUUID()
  assessmentId!: string;

  @IsUUID()
  residentId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
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
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
