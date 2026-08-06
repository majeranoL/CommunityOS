import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { HouseholdStatus } from '@prisma/client';

export class CreateHouseholdDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  block?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  lot?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(HouseholdStatus)
  status?: HouseholdStatus;
}
