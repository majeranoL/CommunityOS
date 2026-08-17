import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { Type } from 'class-transformer';

export class CreateStickerDto {
  @IsUUID()
  @IsNotEmpty()
  vehicleId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  stickerNumber!: string;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  issueDate!: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  expirationDate!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
