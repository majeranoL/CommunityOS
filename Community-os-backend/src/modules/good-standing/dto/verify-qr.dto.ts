import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyQrDto {
  @IsString()
  @IsNotEmpty()
  @Length(30, 64)
  token!: string;
}
