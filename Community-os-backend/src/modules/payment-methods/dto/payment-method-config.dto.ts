import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import {
  PaymentMethodConfigDisplay,
  PaymentMethodConfigMethod,
} from '@prisma/client';

export class PaymentMethodConfigDto {
  @IsEnum(PaymentMethodConfigMethod)
  method!: PaymentMethodConfigMethod;

  @IsEnum(PaymentMethodConfigDisplay)
  @IsOptional()
  displayMode?: PaymentMethodConfigDisplay;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  accountName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  accountNumber?: string;

  @IsUUID()
  @IsOptional()
  qrFileId?: string;

  @IsString()
  @IsOptional()
  qrUrl?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
