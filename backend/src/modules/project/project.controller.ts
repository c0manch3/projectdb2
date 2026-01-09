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
import { AdminGuard, ManagerGuard } from '../../common/guards/roles.guard';

@Controller('project')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @UseGuards(ManagerGuard)
  async findAll(@Query('status') status?: string) {
    return this.projectService.findAll(status);
  }

  @Get(':id')
  @UseGuards(ManagerGuard)
  async findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
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
}
