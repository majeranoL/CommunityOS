import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ResidentService } from './resident.service';
import { CreateResidentDto } from './dto/create-resident.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('residents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResidentController {
  constructor(
    private readonly residentService: ResidentService,
  ) {}

  @Post()
  @Permissions('resident.create')
  create(
    @Request() req: any,
    @Body() dto: CreateResidentDto,
  ) {
    return this.residentService.create(
      req.user.community.id,
      dto,
    );
  }
}