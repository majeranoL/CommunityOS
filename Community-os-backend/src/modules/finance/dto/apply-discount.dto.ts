import { IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType } from '@prisma/client';

export class ApplyDiscountDto {
  @IsEnum(DiscountType)
  type!: DiscountType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  value!: number;
}
