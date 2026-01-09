import { Module } from '@nestjs/common';
import { PaymentScheduleController } from './payment-schedule.controller';
import { PaymentScheduleService } from './payment-schedule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [PaymentScheduleController],
  providers: [PaymentScheduleService],
  exports: [PaymentScheduleService],
})
export class PaymentScheduleModule {}
