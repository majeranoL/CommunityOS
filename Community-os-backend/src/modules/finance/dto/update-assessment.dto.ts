import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateAssessmentDto } from './create-assessment.dto';

import { AssessmentStatus } from '@prisma/client';

export class UpdateAssessmentDto extends PartialType(CreateAssessmentDto) {
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;
}
