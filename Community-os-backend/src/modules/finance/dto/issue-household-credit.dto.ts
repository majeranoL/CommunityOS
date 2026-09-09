import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class IssueHouseholdCreditDto {
  @IsUUID()
  householdId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** Optional construction request the credit is tied to (must belong to the household). */
  @IsOptional()
  @IsUUID()
  constructionRequestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;
}
