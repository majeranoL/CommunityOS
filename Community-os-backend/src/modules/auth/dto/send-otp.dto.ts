import { IsEmail, IsNotEmpty, IsUUID } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsUUID()
  @IsNotEmpty()
  communityId!: string;
}
