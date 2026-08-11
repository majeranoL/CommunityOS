import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

import { Gender } from '@prisma/client';

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from '../../../common/utils/password';

export class CreateUserDto {
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

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  // ==========================================
  // Resident / Household link (no ghost accounts)
  // Exactly one of residentId / householdId is required.
  // ==========================================

  @IsOptional()
  @IsUUID()
  residentId?: string;

  @IsOptional()
  @IsUUID()
  householdId?: string;

  // Used only when householdId is provided (creates a new Resident
  // on that household using the entered details).
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
