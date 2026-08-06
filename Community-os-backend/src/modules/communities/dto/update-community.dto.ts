import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateCommunityDto } from './create-community.dto';

import { CommunityStatus } from '@prisma/client';

export class UpdateCommunityDto extends PartialType(CreateCommunityDto) {
  @IsOptional()
  @IsEnum(CommunityStatus)
  status?: CommunityStatus;
}
