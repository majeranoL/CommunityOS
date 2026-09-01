import { Module } from '@nestjs/common';

import { PublicController } from './public.controller';
import { PublicService } from './public.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { CommunitiesModule } from '../communities/communities.module';
import { AuthModule } from '../auth/auth.module';
import { GoodStandingModule } from '../good-standing/good-standing.module';

@Module({
  imports: [PrismaModule, CommunitiesModule, AuthModule, GoodStandingModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
