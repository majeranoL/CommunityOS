import {
  IsArray,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class ApplyCreditItemDto {
  @IsUUID()
  assessmentId!: string;

  /** Amount to settle with credit. Defaults to the assessment's outstanding balance. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;
}

export class ApplyHouseholdCreditDto {
  @IsUUID()
  householdId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyCreditItemDto)
  allocations?: ApplyCreditItemDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assessmentIds?: string[];
}
