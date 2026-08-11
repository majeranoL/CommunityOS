import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

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
}
