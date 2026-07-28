import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ResidentModule } from './modules/residents/resident.module';
import { PrismaModule } from './prisma/prisma.module';
import { AnnouncementModule } from './modules/announcements/announcement.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ResidentModule,
    AnnouncementModule,
  ],
})
export class AppModule {}