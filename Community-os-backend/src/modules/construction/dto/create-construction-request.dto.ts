import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ConstructionRequestType } from '@prisma/client';

export class ConstructionRequestDocumentDto {
  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  documentType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;

  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class CreateConstructionRequestDto {
  @IsUUID()
  householdId!: string;

  @IsEnum(ConstructionRequestType)
  type!: ConstructionRequestType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contractorName?: string;

  @IsDateString()
  plannedStartDate!: string;

  @IsDateString()
  plannedEndDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bondAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConstructionRequestDocumentDto)
  documents!: ConstructionRequestDocumentDto[];
}
