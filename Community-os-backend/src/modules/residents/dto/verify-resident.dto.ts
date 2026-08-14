import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyResidentDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
