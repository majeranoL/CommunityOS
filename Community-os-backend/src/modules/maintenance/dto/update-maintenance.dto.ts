import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateMaintenanceDto } from './create-maintenance.dto';

import { MaintenanceStatus } from '@prisma/client';

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;
}
