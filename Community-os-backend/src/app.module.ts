import { Module } from '@nestjs/common';
import { RolesModule } from './modules/roles/roles.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ResidentModule } from './modules/residents/resident.module';
import { PrismaModule } from './prisma/prisma.module';
import { AnnouncementModule } from './modules/announcements/announcement.module';
//import { CommunitiesModule } from './modules/communities/communities.module';   
import { ComplaintModule } from './modules/complaint/complaint.module';
@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ResidentModule,
    AnnouncementModule,
    RolesModule,
    ComplaintModule,
    //CommunitiesModule,
  ],
})
export class AppModule {}