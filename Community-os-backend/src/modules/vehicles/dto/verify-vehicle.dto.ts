import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyVehicleDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
