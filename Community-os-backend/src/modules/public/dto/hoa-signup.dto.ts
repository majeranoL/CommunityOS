import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PhoneNumber } from '../../../common/utils/validation';

/**
 * Public HOA signup request. The community email is used as the login, and
 * the owner's email/password are injected from the community step, so they
 * are optional on the owner here (unlike the superadmin provisioning path).
 */
export class HoaSignupOwnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @PhoneNumber()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  block?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  lot?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class HoaSignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEmail()
  @MaxLength(100)
  email!: string;

  @IsOptional()
  @IsString()
  @PhoneNumber()
  @MaxLength(20)
  contactNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Community address is required.' })
  @MinLength(10, {
    message:
      'Please provide a complete community address (street, city, and province).',
  })
  @MaxLength(255)
  address!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @ValidateNested()
  @Type(() => HoaSignupOwnerDto)
  owner!: HoaSignupOwnerDto;
}
