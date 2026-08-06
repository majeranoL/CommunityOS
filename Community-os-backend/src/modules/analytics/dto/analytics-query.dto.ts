import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

import { Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months: number = 6;
}
