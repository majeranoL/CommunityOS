import { IsNumber, Min } from 'class-validator';

import { Type } from 'class-transformer';

export class AdjustHouseholdCreditDto {
  /** The new available balance for the credit line. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;
}
