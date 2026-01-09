import { Module } from '@nestjs/common';
import { WorkloadPlanController } from './workload-plan.controller';
import { WorkloadPlanService } from './workload-plan.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [WorkloadPlanController],
  providers: [WorkloadPlanService],
  exports: [WorkloadPlanService],
})
export class WorkloadPlanModule {}
