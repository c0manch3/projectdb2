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
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/roles.guard';

@Controller('company')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async findAll(@Query('type') type?: string) {
    return this.companyService.findAll(type);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return this.companyService.findOne(uuid);
  }

  @Post('create')
  @UseGuards(AdminGuard)
  async create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Patch(':uuid')
  @UseGuards(AdminGuard)
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(uuid, dto);
  }

  @Delete(':uuid')
  @UseGuards(AdminGuard)
  async delete(@Param('uuid') uuid: string) {
    return this.companyService.delete(uuid);
  }
}
