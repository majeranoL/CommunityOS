import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { CommunitiesModule } from '../communities/communities.module';

@Module({
  imports: [PrismaModule, CommunitiesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
