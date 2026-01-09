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
import { ConstructionService } from './construction.service';
import { CreateConstructionDto, UpdateConstructionDto } from './dto/construction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerGuard } from '../../common/guards/roles.guard';

@Controller('construction')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class ConstructionController {
  constructor(private readonly constructionService: ConstructionService) {}

  @Get()
  @UseGuards(ManagerGuard)
  async findAll(@Query('projectId') projectId?: string) {
    return this.constructionService.findAll(projectId);
  }

  @Get(':id')
  @UseGuards(ManagerGuard)
  async findOne(@Param('id') id: string) {
    return this.constructionService.findOne(id);
  }

  @Post('create')
  @UseGuards(ManagerGuard)
  async create(@Body() dto: CreateConstructionDto) {
    return this.constructionService.create(dto);
  }

  @Patch(':id')
  @UseGuards(ManagerGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateConstructionDto) {
    return this.constructionService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManagerGuard)
  async delete(@Param('id') id: string) {
    return this.constructionService.delete(id);
  }
}
