import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRequestType } from '@prisma/client';

@Injectable()
export class LenconnectChatLogService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const logs = await this.prisma.lenconnectChatLog.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  async findOne(id: string) {
    const log = await this.prisma.lenconnectChatLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Chat log not found');
    }

    return log;
  }

  async findByUser(userId: string) {
    const logs = await this.prisma.lenconnectChatLog.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  async findByUserAndType(userId: string, requestType: ChatRequestType) {
    const logs = await this.prisma.lenconnectChatLog.findMany({
      where: { userId, requestType },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }
}
