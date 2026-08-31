import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

import { HouseholdStatus } from '@prisma/client';

export class HouseholdQueryDto {
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
  @IsString()
  @MaxLength(20)
  block?: string;

  @IsOptional()
  @IsEnum(HouseholdStatus)
  status?: HouseholdStatus;

  @IsOptional()
  @IsIn(['block', 'lot', 'unit', 'createdAt'])
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
