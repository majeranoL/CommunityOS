import { IsEnum, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

import { StickerStatus } from '@prisma/client';

import { CreateStickerDto } from './create-sticker.dto';

export class UpdateStickerDto extends PartialType(CreateStickerDto) {
  @IsOptional()
  @IsEnum(StickerStatus)
  status?: StickerStatus;
}
