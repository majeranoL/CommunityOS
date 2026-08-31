import {
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';

import { Gender, CivilStatus, ResidentType } from '@prisma/client';

import { PhoneNumber } from '../../../common/utils/validation';

export class CreateResidentDto {
  @IsOptional()
  @IsUUID()
  householdId?: string;

  @IsOptional()
  @IsEnum(ResidentType)
  residentType?: ResidentType;

  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(CivilStatus)
  civilStatus?: CivilStatus;

  @IsOptional()
  @IsString()
  @PhoneNumber()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  lot?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
