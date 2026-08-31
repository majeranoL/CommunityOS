import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { VisitorCategory, VisitorStatus } from '@prisma/client';

import { PhoneNumber } from '../../../common/utils/validation';

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @PhoneNumber()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsUUID()
  hostResidentId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsDateString()
  entryAt?: string;

  @IsOptional()
  @IsDateString()
  exitAt?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsEnum(VisitorCategory)
  category?: VisitorCategory;

  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus;
}
