import { IsEnum } from 'class-validator';

import { CommunityStatus } from '@prisma/client';

export class UpdateCommunityStatusDto {
  @IsEnum(CommunityStatus)
  status!: CommunityStatus;
}
