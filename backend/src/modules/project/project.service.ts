import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    const where = status ? { status } : {};

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

  async findOne(id: string) {
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
        _count: {
          select: { constructions: true, documents: true, projectUsers: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async create(dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        contractDate: new Date(dto.contractDate),
        expirationDate: new Date(dto.expirationDate),
        type: dto.type || 'main',
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
        ...(dto.name && { name: dto.name }),
        ...(dto.contractDate && { contractDate: new Date(dto.contractDate) }),
        ...(dto.expirationDate && { expirationDate: new Date(dto.expirationDate) }),
        ...(dto.type && { type: dto.type }),
        ...(dto.status && { status: dto.status }),
        ...(dto.customerId && { customerId: dto.customerId }),
        ...(dto.managerId && { managerId: dto.managerId }),
        ...(dto.mainProjectId !== undefined && { mainProjectId: dto.mainProjectId }),
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
      include: {
        projectUsers: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        workloadPlans: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
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
}
