import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from '../../../common/utils/password';
import { PhoneNumber } from '../../../common/utils/validation';

export class ProvisionOwnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_RULE, { message: PASSWORD_RULE_MESSAGE })
  password!: string;
}

export class ProvisionCommunityDto {
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
  @IsUUID()
  planId?: string;

  @ValidateNested()
  @Type(() => ProvisionOwnerDto)
  owner!: ProvisionOwnerDto;
}
