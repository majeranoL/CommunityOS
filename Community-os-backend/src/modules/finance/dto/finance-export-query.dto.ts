import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';

import { FinanceCategory } from '@prisma/client';

export class FinanceExportQueryDto {
  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format: 'csv' | 'xlsx' = 'csv';

  @IsOptional()
  @IsEnum(FinanceCategory)
  category?: FinanceCategory;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
