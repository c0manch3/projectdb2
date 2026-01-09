import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('projects-workload')
  @Roles('Manager', 'Admin', 'Trial')
  async getProjectsWorkload(
    @Query('date') date?: string,
    @Query('compareDate') compareDate?: string,
  ) {
    return this.analyticsService.getProjectsWorkload(date, compareDate);
  }

  @Get('employee-work-hours')
  @Roles('Manager', 'Admin', 'Trial')
  async getEmployeeWorkHours(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getEmployeeWorkHours(startDate, endDate);
  }
}
