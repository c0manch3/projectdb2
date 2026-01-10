import { Module } from '@nestjs/common';
import { LenconnectChatLogController } from './lenconnect-chat-log.controller';
import { LenconnectChatLogService } from './lenconnect-chat-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [LenconnectChatLogController],
  providers: [LenconnectChatLogService],
  exports: [LenconnectChatLogService],
})
export class LenconnectChatLogModule {}
