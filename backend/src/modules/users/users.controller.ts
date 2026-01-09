import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { LoginDto, RegisterDto, ChangePasswordDto, UpdateUserDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard, ManagerGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Public endpoints
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.usersService.login(dto);
  }

  // Admin only - register new users
  @Post('register')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async register(@Body() dto: RegisterDto) {
    return this.usersService.register(dto);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.usersService.refreshTokens(refreshToken);
  }

  @Post('check')
  @UseGuards(JwtAuthGuard)
  async check(@CurrentUser('sub') userId: string) {
    return this.usersService.validateToken(userId);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  // Manager or Admin - get all users (view only for Manager)
  @Get()
  @UseGuards(JwtAuthGuard, ManagerGuard)
  async findAll() {
    return this.usersService.findAll();
  }

  // Manager - get available employees for a date
  @Get('available-employees')
  @UseGuards(JwtAuthGuard, ManagerGuard)
  async getAvailableEmployees(@Query('date') date: string) {
    return this.usersService.getAvailableEmployees(new Date(date));
  }

  // Admin only - delete user
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  // Admin only - update user
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
