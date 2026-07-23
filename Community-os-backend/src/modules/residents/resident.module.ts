import { Module } from '@nestjs/common';

import { ResidentController } from './resident.controller';
import { ResidentService } from './resident.service';

import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResidentController],
  providers: [ResidentService],
  exports: [ResidentService],
})
export class ResidentModule {}