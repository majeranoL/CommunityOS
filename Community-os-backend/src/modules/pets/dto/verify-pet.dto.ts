import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyPetDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
