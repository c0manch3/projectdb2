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
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard, ManagerGuard, ManagerOrTrialGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('project')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @CurrentUser() user?: { sub: string; role: string },
  ) {
    return this.projectService.findAll(status, user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: { sub: string; role: string },
  ) {
    return this.projectService.findOne(id, user);
  }

  @Post('create')
  @UseGuards(ManagerGuard)
  async create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }

  @Patch(':id')
  @UseGuards(ManagerGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    return this.projectService.delete(id);
  }

  @Get(':projectId/workload/employees')
  @UseGuards(ManagerGuard)
  async getProjectEmployeeWorkload(@Param('projectId') projectId: string) {
    return this.projectService.getProjectEmployeeWorkload(projectId);
  }

  @Get(':projectId/workload/employees/:userId')
  @UseGuards(ManagerGuard)
  async getEmployeeWorkloadOnProject(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectService.getEmployeeWorkloadOnProject(projectId, userId);
  }

  // Project User Management endpoints
  @Get(':projectId/users')
  @UseGuards(ManagerOrTrialGuard)
  async getProjectUsers(@Param('projectId') projectId: string) {
    return this.projectService.getProjectUsers(projectId);
  }

  @Get(':projectId/available-users')
  @UseGuards(ManagerGuard)
  async getAvailableUsersForProject(@Param('projectId') projectId: string) {
    return this.projectService.getAvailableUsersForProject(projectId);
  }

  @Post(':projectId/users/:userId')
  @UseGuards(ManagerGuard)
  async addProjectUser(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectService.addProjectUser(projectId, userId);
  }

  @Delete(':projectId/users/:userId')
  @UseGuards(ManagerGuard)
  async removeProjectUser(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectService.removeProjectUser(projectId, userId);
  }
}
