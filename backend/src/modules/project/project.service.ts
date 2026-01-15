import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectType, UserRole } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string, user?: { sub: string; role: string }) {
    // Build where clause based on user role
    let where: any = status ? { status } : {};

    // Feature #328: Managers can only see projects where they are the manager
    if (user?.role === UserRole.Manager) {
      where = {
        ...where,
        managerId: user.sub,
      };
    }

    // Employees can only see projects they're assigned to
    if (user?.role === UserRole.Employee) {
      where = {
        ...where,
        projectUsers: {
          some: {
            userId: user.sub,
          },
        },
      };
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, type: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        mainProject: {
          select: { id: true, name: true },
        },
        _count: {
          select: { constructions: true, documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  }

  async findOne(id: string, user?: { sub: string; role: string }) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        mainProject: {
          select: { id: true, name: true },
        },
        additionalProjects: {
          select: { id: true, name: true, status: true },
        },
        constructions: true,
        documents: {
          include: {
            uploadedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        paymentSchedules: true,
        projectUsers: {
          select: { userId: true },
        },
        _count: {
          select: { constructions: true, documents: true, projectUsers: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // For Employees, verify they're assigned to the project
    if (user?.role === UserRole.Employee) {
      const isAssigned = project.projectUsers.some((pu: { userId: string }) => pu.userId === user.sub);
      if (!isAssigned) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    return project;
  }

  async create(dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        contractDate: new Date(dto.contractDate),
        expirationDate: new Date(dto.expirationDate),
        type: dto.type || ProjectType.main,
        customerId: dto.customerId,
        managerId: dto.managerId,
        mainProjectId: dto.mainProjectId,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        contractDate: dto.contractDate ? new Date(dto.contractDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        type: dto.type,
        status: dto.status,
        customerId: dto.customerId,
        managerId: dto.managerId,
        mainProjectId: dto.mainProjectId,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  async delete(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }

  async getProjectEmployeeWorkload(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all workload distributions for this project with user and workload details
    const distributions = await this.prisma.projectWorkloadDistribution.findMany({
      where: { projectId },
      include: {
        workloadActual: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: {
        workloadActual: {
          date: 'desc',
        },
      },
    });

    // Group by user and calculate total hours
    const employeeWorkloadMap = new Map<string, {
      user: { id: string; firstName: string; lastName: string; email: string };
      totalHours: number;
      reports: {
        id: string;
        date: Date;
        hours: number;
        description: string;
        totalDayHours: number;
        userText: string | null;
      }[];
    }>();

    for (const dist of distributions) {
      const userId = dist.workloadActual.user.id;
      const existing = employeeWorkloadMap.get(userId);

      const reportEntry = {
        id: dist.id,
        date: dist.workloadActual.date,
        hours: dist.hours,
        description: dist.description,
        totalDayHours: dist.workloadActual.hoursWorked,
        userText: dist.workloadActual.userText,
      };

      if (existing) {
        existing.totalHours += dist.hours;
        existing.reports.push(reportEntry);
      } else {
        employeeWorkloadMap.set(userId, {
          user: dist.workloadActual.user,
          totalHours: dist.hours,
          reports: [reportEntry],
        });
      }
    }

    // Convert map to array and calculate totals
    const employeeWorkload = Array.from(employeeWorkloadMap.values());
    const totalProjectHours = employeeWorkload.reduce((sum, emp) => sum + emp.totalHours, 0);

    return {
      projectId,
      projectName: project.name,
      totalProjectHours,
      employeeCount: employeeWorkload.length,
      employeeWorkload,
    };
  }

  async getEmployeeWorkloadOnProject(projectId: string, userId: string) {
    const workload = await this.prisma.workloadPlan.findMany({
      where: {
        projectId,
        userId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return workload;
  }

  // Project User Management
  async getProjectUsers(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const projectUsers = await this.prisma.projectUser.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    return projectUsers;
  }

  async addProjectUser(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already assigned
    const existing = await this.prisma.projectUser.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const projectUser = await this.prisma.projectUser.create({
      data: {
        userId,
        projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return projectUser;
  }

  async removeProjectUser(projectId: string, userId: string) {
    const projectUser = await this.prisma.projectUser.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!projectUser) {
      throw new NotFoundException('User not assigned to this project');
    }

    await this.prisma.projectUser.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    return { message: 'User removed from project successfully' };
  }

  async getAvailableUsersForProject(projectId: string) {
    // Get all users that are not already assigned to this project
    const assignedUserIds = await this.prisma.projectUser.findMany({
      where: { projectId },
      select: { userId: true },
    });

    const assignedIds = assignedUserIds.map((pu) => pu.userId);

    const availableUsers = await this.prisma.user.findMany({
      where: {
        id: {
          notIn: assignedIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return availableUsers;
  }
}
