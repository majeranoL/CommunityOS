import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from '../../../common/utils/password';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  @Matches(PASSWORD_RULE, { message: PASSWORD_RULE_MESSAGE })
  password!: string;
}
