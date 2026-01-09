import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkloadPlanService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    userId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.projectId) where.projectId = filters.projectId;

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters?.startDate) where.date.gte = new Date(filters.startDate);
      if (filters?.endDate) where.date.lte = new Date(filters.endDate);
    }

    return this.prisma.workloadPlan.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.workloadPlan.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Workload plan not found');
    }

    return plan;
  }

  async create(data: {
    userId: string;
    projectId: string;
    managerId: string;
    date: Date;
  }) {
    // Check if plan already exists for this user on this date
    const existing = await this.prisma.workloadPlan.findUnique({
      where: {
        userId_date: {
          userId: data.userId,
          date: new Date(data.date),
        },
      },
    });

    if (existing) {
      throw new ConflictException('A workload plan already exists for this user on this date');
    }

    return this.prisma.workloadPlan.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        managerId: data.managerId,
        date: new Date(data.date),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      projectId?: string;
      date?: Date;
    },
  ) {
    const plan = await this.prisma.workloadPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Workload plan not found');
    }

    // If date is being changed, check for conflicts
    if (data.date) {
      const existing = await this.prisma.workloadPlan.findFirst({
        where: {
          userId: plan.userId,
          date: new Date(data.date),
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('A workload plan already exists for this user on this date');
      }
    }

    return this.prisma.workloadPlan.update({
      where: { id },
      data: {
        projectId: data.projectId,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async delete(id: string) {
    const plan = await this.prisma.workloadPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Workload plan not found');
    }

    await this.prisma.workloadPlan.delete({
      where: { id },
    });

    return { message: 'Workload plan deleted successfully' };
  }

  // Get calendar view for a date range
  async getCalendarView(startDate: Date, endDate: Date, userId?: string, projectId?: string) {
    const where: any = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (userId) where.userId = userId;
    if (projectId) where.projectId = projectId;

    const plans = await this.prisma.workloadPlan.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ date: 'asc' }, { user: { lastName: 'asc' } }],
    });

    // Group by date
    const calendarData: Record<string, any[]> = {};

    plans.forEach((plan) => {
      const dateKey = plan.date.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push({
        id: plan.id,
        user: plan.user,
        project: plan.project,
      });
    });

    return calendarData;
  }
}
