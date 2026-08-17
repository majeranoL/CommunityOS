import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyStickerDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
