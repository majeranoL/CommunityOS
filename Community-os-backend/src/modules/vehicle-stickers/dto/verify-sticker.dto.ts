import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class VerifyStickerDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'Sticker number may only contain letters, numbers, and dashes.',
  })
  stickerNumber?: string;
}
