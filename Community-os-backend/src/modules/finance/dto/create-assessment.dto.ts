import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  assessmentNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  householdId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  period?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsUUID()
  chargeTypeId?: string;

  @IsOptional()
  @IsUUID()
  billingPeriodId?: string;
}
