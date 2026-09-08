import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { HouseholdAcquisitionRequestStatus } from '@prisma/client';

export class ReviewHouseholdAcquisitionRequestDto {
  @IsEnum(HouseholdAcquisitionRequestStatus)
  status!: HouseholdAcquisitionRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNotes?: string;
}
