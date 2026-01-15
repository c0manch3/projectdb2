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
import { WorkloadPlanService } from './workload-plan.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('workload-plan')
@UseGuards(JwtAuthGuard)
export class WorkloadPlanController {
  constructor(private readonly workloadPlanService: WorkloadPlanService) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workloadPlanService.findAll({
      userId,
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('calendar')
  async getCalendarView(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.workloadPlanService.getCalendarView(
      new Date(startDate),
      new Date(endDate),
      userId,
      projectId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workloadPlanService.findOne(id);
  }

  @Post('create')
  @UseGuards(ManagerGuard)
  async create(
    @Body()
    dto: {
      userId: string;
      projectId: string;
      date: Date;
    },
    @CurrentUser('sub') managerId: string,
  ) {
    return this.workloadPlanService.create({
      ...dto,
      managerId,
    });
  }

  @Patch(':id')
  @UseGuards(ManagerGuard)
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      projectId?: string;
      date?: Date;
    },
    @CurrentUser('sub') managerId: string,
  ) {
    return this.workloadPlanService.update(id, dto, managerId);
  }

  @Delete(':id')
  @UseGuards(ManagerGuard)
  async delete(@Param('id') id: string, @CurrentUser('sub') managerId: string) {
    return this.workloadPlanService.delete(id, managerId);
  }
}
