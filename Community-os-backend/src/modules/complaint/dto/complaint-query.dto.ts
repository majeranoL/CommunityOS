import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { Transform } from 'class-transformer';

import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@prisma/client';

export class ComplaintQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  @IsOptional()
  @IsIn([
    'complaintNumber',
    'title',
    'status',
    'priority',
    'createdAt',
  ])
  sortBy = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}