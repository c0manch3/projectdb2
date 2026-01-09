import { Module } from '@nestjs/common';
import { WorkloadActualController } from './workload-actual.controller';
import { WorkloadActualService } from './workload-actual.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [WorkloadActualController],
  providers: [WorkloadActualService],
  exports: [WorkloadActualService],
})
export class WorkloadActualModule {}
