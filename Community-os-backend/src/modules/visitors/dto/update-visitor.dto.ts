import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateVisitorDto } from './create-visitor.dto';

import { VisitorStatus } from '@prisma/client';

export class UpdateVisitorDto extends PartialType(CreateVisitorDto) {
  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus;
}
