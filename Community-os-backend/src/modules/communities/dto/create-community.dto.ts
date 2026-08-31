import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CommunityStatus } from '@prisma/client';

import { PhoneNumber } from '../../../common/utils/validation';

export class CreateCommunityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @PhoneNumber()
  @MaxLength(20)
  contactNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsEnum(CommunityStatus)
  status?: CommunityStatus;
}
