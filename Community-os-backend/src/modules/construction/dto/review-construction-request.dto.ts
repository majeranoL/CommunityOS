import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { ConstructionRequestStatus } from '@prisma/client';

export class ReviewConstructionRequestDto {
  @IsEnum(ConstructionRequestStatus)
  status!: ConstructionRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
