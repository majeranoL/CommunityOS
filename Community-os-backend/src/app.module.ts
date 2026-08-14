import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RolesModule } from './modules/roles/roles.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ResidentModule } from './modules/residents/resident.module';
import { PrismaModule } from './prisma/prisma.module';
import { AnnouncementModule } from './modules/announcements/announcement.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { HouseholdsModule } from './modules/households/households.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { PetsModule } from './modules/pets/pets.module';
import { StaffModule } from './modules/staff/staff.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EventsModule } from './modules/events/events.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PollsModule } from './modules/polls/polls.module';
import { AuditLogsModule } from './modules/auditlogs/audit-logs.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module';
import { FeaturesModule } from './modules/features/features.module';
import { PublicModule } from './modules/public/public.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: process.env.THROTTLE_DISABLED === 'true' ? 1_000_000 : 100,
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ResidentModule,
    AnnouncementModule,
    RolesModule,
    ComplaintModule,
    CommunitiesModule,
    PermissionsModule,
    UploadsModule,
    FacilitiesModule,
    ReservationsModule,
    HouseholdsModule,
    VisitorsModule,
    VehiclesModule,
    PetsModule,
    StaffModule,
    MaintenanceModule,
    FinanceModule,
    DocumentsModule,
    EventsModule,
    DashboardModule,
    AnalyticsModule,
    ReportsModule,
    NotificationsModule,
    SubscriptionsModule,
    PollsModule,
    AuditLogsModule,
    SettingsModule,
    PlatformSettingsModule,
    FeaturesModule,
    PublicModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
