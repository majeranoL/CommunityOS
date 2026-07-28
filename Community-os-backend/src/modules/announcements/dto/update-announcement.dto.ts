import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateAnnouncementDto } from './create-announcement.dto';

import { AnnouncementStatus } from '@prisma/client';

export class UpdateAnnouncementDto extends PartialType(
  CreateAnnouncementDto,
) {
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;
}