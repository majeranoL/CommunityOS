import { IsIn, IsOptional, Matches } from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @IsIn(['csv', 'json'])
  format: string = 'csv';

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}
