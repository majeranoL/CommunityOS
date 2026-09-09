import { IsEnum, IsOptional, IsString } from 'class-validator';

import {
  ConstructionRequestStatus,
  ConstructionRequestType,
} from '@prisma/client';

export class ConstructionQueryDto {
  @IsOptional()
  @IsEnum(ConstructionRequestStatus)
  status?: ConstructionRequestStatus;

  @IsOptional()
  @IsEnum(ConstructionRequestType)
  type?: ConstructionRequestType;

  @IsOptional()
  @IsString()
  search?: string;
}
