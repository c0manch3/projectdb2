import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { CompanyModule } from './modules/company/company.module';
import { ProjectModule } from './modules/project/project.module';
import { ConstructionModule } from './modules/construction/construction.module';
import { DocumentModule } from './modules/document/document.module';
import { WorkloadPlanModule } from './modules/workload-plan/workload-plan.module';
import { WorkloadActualModule } from './modules/workload-actual/workload-actual.module';
import { WorkloadModule } from './modules/workload/workload.module';
import { PaymentScheduleModule } from './modules/payment-schedule/payment-schedule.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LenconnectChatLogModule } from './modules/lenconnect-chat-log/lenconnect-chat-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    CompanyModule,
    ProjectModule,
    ConstructionModule,
    DocumentModule,
    WorkloadPlanModule,
    WorkloadActualModule,
    WorkloadModule,
    PaymentScheduleModule,
    AnalyticsModule,
    LenconnectChatLogModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
