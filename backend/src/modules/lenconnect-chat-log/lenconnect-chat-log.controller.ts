import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LenconnectChatLogService } from './lenconnect-chat-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/roles.guard';
import { ChatRequestType } from '@prisma/client';

@Controller('lenconnect-chat-logs')
@UseGuards(JwtAuthGuard, AdminGuard) // All routes require Admin authentication
export class LenconnectChatLogController {
  constructor(private readonly chatLogService: LenconnectChatLogService) {}

  @Get()
  async findAll() {
    return this.chatLogService.findAll();
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return this.chatLogService.findOne(uuid);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.chatLogService.findByUser(userId);
  }

  @Get('user/:userId/:requestType')
  async findByUserAndType(
    @Param('userId') userId: string,
    @Param('requestType') requestType: ChatRequestType,
  ) {
    return this.chatLogService.findByUserAndType(userId, requestType);
  }
}
