import { Type } from 'class-transformer';
import { IsISO8601, IsNumber, IsOptional, Matches, Min } from 'class-validator';

export class CreateDuesMonthDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format (e.g. 2026-08).',
  })
  month!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}
