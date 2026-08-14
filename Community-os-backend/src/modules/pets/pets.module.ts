import { Module } from '@nestjs/common';

import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { FeaturesModule } from '../features/features.module';

@Module({
  imports: [PrismaModule, FeaturesModule],
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
