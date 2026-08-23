import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

import { UtilityRateMode, UtilityType } from '@prisma/client';

export class TieredRateDto {
  @IsNumber()
  @Min(0)
  upTo!: number | null;

  @IsNumber()
  @Min(0)
  rate!: number;
}

export class CreateUtilityConfigDto {
  @IsEnum(UtilityType)
  utilityType!: UtilityType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(UtilityRateMode)
  rateMode!: UtilityRateMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fixedRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TieredRateDto)
  tieredRates?: TieredRateDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUtilityConfigDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(UtilityRateMode)
  rateMode?: UtilityRateMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fixedRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TieredRateDto)
  tieredRates?: TieredRateDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UtilityConfigQueryDto {
  @IsOptional()
  @IsEnum(UtilityType)
  utilityType?: UtilityType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateUtilityReadingDto {
  @IsString()
  @IsNotEmpty()
  utilityConfigId!: string;

  @IsString()
  @IsNotEmpty()
  householdId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  periodKey!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  previousReading?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentReading?: number;

  @IsOptional()
  @IsDateString()
  readingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateUtilityReadingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  previousReading?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentReading?: number;

  @IsOptional()
  @IsDateString()
  readingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UtilityReadingQueryDto {
  @IsOptional()
  @IsString()
  utilityConfigId?: string;

  @IsOptional()
  @IsString()
  householdId?: string;

  @IsOptional()
  @IsString()
  periodKey?: string;
}

export class GenerateUtilityBillsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  periodKey?: string;
}
