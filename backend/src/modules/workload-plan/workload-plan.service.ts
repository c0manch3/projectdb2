import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
    // Validate that date is not in the past (can be today or future)
    const planDate = new Date(data.date);
    planDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (planDate < today) {
      throw new BadRequestException('Cannot create workload plan for past dates');
    }

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
    managerId?: string,
  ) {
    const plan = await this.prisma.workloadPlan.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, role: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Workload plan not found');
    }

    // Validate that the original plan date is not in the past (can be today or future)
    const originalDate = new Date(plan.date);
    originalDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (originalDate < today) {
      throw new BadRequestException('Cannot update workload plan for past dates');
    }

    // Check authorization: only the manager who created the plan (or Admin) can update it
    if (managerId && plan.managerId !== managerId) {
      // Need to fetch the current user's role to check if they are Admin
      const currentUser = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { role: true },
      });

      if (!currentUser || currentUser.role !== 'Admin') {
        throw new ForbiddenException('Only the manager who created this plan can update it');
      }
    }

    // If date is being changed, validate new date is not in the past
    if (data.date) {
      const newDate = new Date(data.date);
      newDate.setHours(0, 0, 0, 0);

      if (newDate < today) {
        throw new BadRequestException('Cannot change workload plan to a past date');
      }

      // Check for conflicts with the new date
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

  async delete(id: string, managerId?: string) {
    const plan = await this.prisma.workloadPlan.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, role: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Workload plan not found');
    }

    // Validate that the plan date is not in the past (can be today or future)
    const planDate = new Date(plan.date);
    planDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (planDate < today) {
      throw new BadRequestException('Cannot delete workload plan for past dates');
    }

    // Check authorization: only the manager who created the plan (or Admin) can delete it
    if (managerId && plan.managerId !== managerId) {
      // Need to fetch the current user's role to check if they are Admin
      const currentUser = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { role: true },
      });

      if (!currentUser || currentUser.role !== 'Admin') {
        throw new ForbiddenException('Only the manager who created this plan can delete it');
      }
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
      // Use local date methods to avoid timezone shifts
      const year = plan.date.getFullYear();
      const month = String(plan.date.getMonth() + 1).padStart(2, '0');
      const day = String(plan.date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
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
