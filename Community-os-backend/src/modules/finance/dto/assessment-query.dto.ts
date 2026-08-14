import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import { AssessmentStatus, FinanceCategory } from '@prisma/client';

export class AssessmentQueryDto {
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
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @IsOptional()
  @IsUUID()
  householdId?: string;

  @IsOptional()
  @IsUUID()
  chargeTypeId?: string;

  @IsOptional()
  @IsUUID()
  billingPeriodId?: string;

  @IsOptional()
  @IsEnum(FinanceCategory)
  category?: FinanceCategory;

  @IsOptional()
  @IsIn(['assessmentNumber', 'title', 'dueDate', 'amount', 'createdAt'])
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
