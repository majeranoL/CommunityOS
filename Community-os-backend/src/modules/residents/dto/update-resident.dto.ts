import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateResidentDto } from './create-resident.dto';
import { ResidentStatus } from '@prisma/client';

export class UpdateResidentDto extends PartialType(CreateResidentDto) {
  @IsOptional()
  @IsEnum(ResidentStatus)
  status?: ResidentStatus;
}