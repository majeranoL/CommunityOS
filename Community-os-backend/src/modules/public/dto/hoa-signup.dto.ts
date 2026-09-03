import { IsEmail, MaxLength } from 'class-validator';

import { ProvisionCommunityDto } from '../../communities/dto/provision-community.dto';

export class HoaSignupDto extends ProvisionCommunityDto {
  @IsEmail()
  @MaxLength(100)
  override email: string = '';
}
