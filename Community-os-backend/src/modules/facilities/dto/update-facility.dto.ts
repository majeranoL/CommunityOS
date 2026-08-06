import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateFacilityDto } from './create-facility.dto';

import { FacilityStatus } from '@prisma/client';

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {
  @IsOptional()
  @IsEnum(FacilityStatus)
  status?: FacilityStatus;
}
