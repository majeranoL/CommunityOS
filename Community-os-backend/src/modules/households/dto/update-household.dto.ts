import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateHouseholdDto } from './create-household.dto';

import { HouseholdStatus } from '@prisma/client';

export class UpdateHouseholdDto extends PartialType(CreateHouseholdDto) {
  @IsOptional()
  @IsEnum(HouseholdStatus)
  status?: HouseholdStatus;
}
