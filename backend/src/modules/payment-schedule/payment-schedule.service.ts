import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentType } from '@prisma/client';

@Injectable()
export class PaymentScheduleService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    return this.prisma.paymentSchedule.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { expectedDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    return payment;
  }

  async create(data: {
    projectId: string;
    type: PaymentType;
    name: string;
    amount: number;
    percentage?: number;
    expectedDate: Date;
    actualDate?: Date;
    isPaid?: boolean;
    description?: string;
  }) {
    return this.prisma.paymentSchedule.create({
      data: {
        projectId: data.projectId,
        type: data.type,
        name: data.name,
        amount: data.amount,
        percentage: data.percentage,
        expectedDate: new Date(data.expectedDate),
        actualDate: data.actualDate ? new Date(data.actualDate) : null,
        isPaid: data.isPaid ?? false,
        description: data.description,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      type?: PaymentType;
      name?: string;
      amount?: number;
      percentage?: number;
      expectedDate?: Date;
      actualDate?: Date;
      isPaid?: boolean;
      description?: string;
    },
  ) {
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    return this.prisma.paymentSchedule.update({
      where: { id },
      data: {
        type: data.type,
        name: data.name,
        amount: data.amount,
        percentage: data.percentage,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        actualDate: data.actualDate ? new Date(data.actualDate) : undefined,
        isPaid: data.isPaid,
        description: data.description,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string) {
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    await this.prisma.paymentSchedule.delete({
      where: { id },
    });

    return { message: 'Payment schedule deleted successfully' };
  }

  async markAsPaid(id: string, actualDate?: Date) {
    const payment = await this.prisma.paymentSchedule.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment schedule not found');
    }

    return this.prisma.paymentSchedule.update({
      where: { id },
      data: {
        isPaid: true,
        actualDate: actualDate ? new Date(actualDate) : new Date(),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
