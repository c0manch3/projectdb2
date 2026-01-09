import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkloadActualService } from './workload-actual.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('workload-actual')
@UseGuards(JwtAuthGuard)
export class WorkloadActualController {
  constructor(private readonly workloadActualService: WorkloadActualService) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workloadActualService.findAll({
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('my')
  async getMyWorkload(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.workloadActualService.getMyWorkload(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('date/:date')
  async findByDate(
    @CurrentUser('sub') userId: string,
    @Param('date') date: string,
  ) {
    return this.workloadActualService.findByUserAndDate(userId, new Date(date));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workloadActualService.findOne(id);
  }

  @Post('create')
  async create(
    @CurrentUser('sub') userId: string,
    @Body()
    dto: {
      date: Date;
      hoursWorked: number;
      userText?: string;
      distributions?: { projectId: string; hours: number; description?: string }[];
    },
  ) {
    return this.workloadActualService.create({
      userId,
      ...dto,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      hoursWorked?: number;
      userText?: string;
    },
  ) {
    return this.workloadActualService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workloadActualService.delete(id);
  }

  // Distribution endpoints
  @Post(':id/distribution')
  async addDistribution(
    @Param('id') id: string,
    @Body()
    dto: {
      projectId: string;
      hours: number;
      description?: string;
    },
  ) {
    return this.workloadActualService.addDistribution(id, dto);
  }

  @Delete('distribution/:distributionId')
  async removeDistribution(@Param('distributionId') distributionId: string) {
    return this.workloadActualService.removeDistribution(distributionId);
  }
}
