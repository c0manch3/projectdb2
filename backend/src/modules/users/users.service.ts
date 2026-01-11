import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateUserDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        telegramId: user.telegramId ? user.telegramId.toString() : undefined,
        salary: user.salary ? Number(user.salary) : undefined,
        dateBirth: user.dateBirth?.toISOString(),
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role || UserRole.Employee,
        salary: dto.salary,
        dateBirth: dto.dateBirth ? new Date(dto.dateBirth) : new Date(),
      },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      salary: user.salary ? Number(user.salary) : undefined,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Invalidate all refresh tokens stored in database
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password changed successfully' };
  }

  async validateToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        telegramId: true,
        salary: true,
        dateBirth: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      ...user,
      telegramId: user.telegramId ? user.telegramId.toString() : undefined,
      salary: user.salary ? Number(user.salary) : undefined,
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        telegramId: true,
        salary: true,
        dateBirth: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      telegramId: user.telegramId ? user.telegramId.toString() : undefined,
      salary: user.salary ? Number(user.salary) : undefined,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Convert telegramId to BigInt if provided
    const updateData: any = { ...dto };
    if (dto.telegramId !== undefined) {
      updateData.telegramId = dto.telegramId ? BigInt(dto.telegramId) : null;
    }
    if (dto.dateBirth !== undefined) {
      updateData.dateBirth = new Date(dto.dateBirth);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        telegramId: true,
        salary: true,
        dateBirth: true,
      },
    });

    return {
      ...updated,
      telegramId: updated.telegramId ? updated.telegramId.toString() : undefined,
      salary: updated.salary ? Number(updated.salary) : undefined,
    };
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete all related records in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete refresh tokens
      await tx.refreshToken.deleteMany({ where: { userId: id } });

      // Delete workload actuals and their distributions
      const workloadActuals = await tx.workloadActual.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const workloadActualIds = workloadActuals.map((wa) => wa.id);

      if (workloadActualIds.length > 0) {
        await tx.projectWorkloadDistribution.deleteMany({
          where: { workloadActualId: { in: workloadActualIds } },
        });
        await tx.workloadActual.deleteMany({ where: { userId: id } });
      }

      // Delete workload plans (where user is the employee)
      await tx.workloadPlan.deleteMany({ where: { userId: id } });

      // Update workload plans where user is the manager (set to null or another admin)
      await tx.workloadPlan.deleteMany({ where: { managerId: id } });

      // Update documents uploaded by this user (set uploadedById to null is not possible, delete them)
      await tx.document.deleteMany({ where: { uploadedById: id } });

      // Remove user from project assignments
      await tx.projectUser.deleteMany({ where: { userId: id } });

      // Update projects where user is manager (set managerId to null)
      await tx.project.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });

      // Delete the user
      await tx.user.delete({ where: { id } });
    });

    return { message: 'User deleted successfully' };
  }

  async getAvailableEmployees(date: Date) {
    // Get all employees who don't have workload planned for this date
    const employees = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.Employee, UserRole.Manager] },
        workloadPlans: {
          none: {
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    return employees;
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: 900, // 15 minutes in seconds
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: 604800, // 7 days in seconds
    });

    return { accessToken, refreshToken };
  }
}
