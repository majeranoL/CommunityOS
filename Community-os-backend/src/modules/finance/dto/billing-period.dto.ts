import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import { BillingPeriodStatus } from '@prisma/client';

export class CreateBillingPeriodDto {
  @IsUUID()
  chargeTypeId!: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'periodKey must be in YYYY-MM format',
  })
  periodKey!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class GenerateBillingPeriodsDto {
  @IsUUID()
  chargeTypeId!: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'periodKey must be in YYYY-MM format',
  })
  periodKey!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class BillingPeriodQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsUUID()
  chargeTypeId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  periodKey?: string;

  @IsOptional()
  @IsEnum(BillingPeriodStatus)
  status?: BillingPeriodStatus;

  @IsOptional()
  @IsIn(['periodKey', 'dueDate', 'amount', 'createdAt'])
  sortBy: string = 'periodKey';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
