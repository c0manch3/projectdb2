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
import { PaymentScheduleService } from './payment-schedule.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerGuard } from '../../common/guards/roles.guard';
import { PaymentType } from '@prisma/client';

@Controller('payment-schedule')
@UseGuards(JwtAuthGuard)
export class PaymentScheduleController {
  constructor(private readonly paymentScheduleService: PaymentScheduleService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.paymentScheduleService.findAll(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentScheduleService.findOne(id);
  }

  @Post('create')
  @UseGuards(ManagerGuard)
  async create(
    @Body()
    dto: {
      projectId: string;
      type: PaymentType;
      name: string;
      amount: number;
      percentage?: number;
      expectedDate: Date;
      actualDate?: Date;
      isPaid?: boolean;
      description?: string;
    },
  ) {
    return this.paymentScheduleService.create(dto);
  }

  @Patch(':id')
  @UseGuards(ManagerGuard)
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      type?: PaymentType;
      name?: string;
      amount?: number;
      percentage?: number;
      expectedDate?: Date;
      actualDate?: Date;
      isPaid?: boolean;
      description?: string;
    },
  ) {
    return this.paymentScheduleService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ManagerGuard)
  async delete(@Param('id') id: string) {
    return this.paymentScheduleService.delete(id);
  }

  @Patch(':id/mark-paid')
  @UseGuards(ManagerGuard)
  async markAsPaid(
    @Param('id') id: string,
    @Body() dto: { actualDate?: Date },
  ) {
    return this.paymentScheduleService.markAsPaid(id, dto.actualDate);
  }
}
