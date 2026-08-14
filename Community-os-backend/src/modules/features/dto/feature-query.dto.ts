import { Type } from 'class-transformer';

import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { FeatureType } from '@prisma/client';

export class FeatureQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FeatureType)
  type?: FeatureType;

  @IsOptional()
  @IsString()
  communityId?: string;
}
