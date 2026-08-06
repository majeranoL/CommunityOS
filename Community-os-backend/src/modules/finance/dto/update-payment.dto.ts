import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreatePaymentDto } from './create-payment.dto';

import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
