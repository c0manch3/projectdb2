import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConstructionDto, UpdateConstructionDto } from './dto/construction.dto';

@Injectable()
export class ConstructionService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const constructions = await this.prisma.construction.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return constructions;
  }

  async findOne(id: string) {
    const construction = await this.prisma.construction.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        documents: {
          include: {
            uploadedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!construction) {
      throw new NotFoundException('Construction not found');
    }

    return construction;
  }

  async create(dto: CreateConstructionDto) {
    const construction = await this.prisma.construction.create({
      data: dto,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return construction;
  }

  async update(id: string, dto: UpdateConstructionDto) {
    const construction = await this.prisma.construction.findUnique({
      where: { id },
    });

    if (!construction) {
      throw new NotFoundException('Construction not found');
    }

    const updated = await this.prisma.construction.update({
      where: { id },
      data: dto,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return updated;
  }

  async delete(id: string) {
    const construction = await this.prisma.construction.findUnique({
      where: { id },
    });

    if (!construction) {
      throw new NotFoundException('Construction not found');
    }

    await this.prisma.construction.delete({
      where: { id },
    });

    return { message: 'Construction deleted successfully' };
  }
}
