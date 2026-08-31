import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Gender } from '@prisma/client';

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from '../../../common/utils/password';
import { PhoneNumber } from '../../../common/utils/validation';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_RULE, { message: PASSWORD_RULE_MESSAGE })
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  @PhoneNumber()
  phoneNumber?: string;

  @IsUUID()
  @IsNotEmpty()
  communityId!: string;

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
  @IsEnum(Gender)
  gender?: Gender;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  otpCode!: string;
}
