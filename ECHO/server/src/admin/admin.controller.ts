import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Login is UNGUARDED — no JWT required
  @Post('login')
  async login(@Body() dto: { username: string; password: string }) {
    return this.adminService.login(dto);
  }

  @Get('volunteers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getVolunteers() {
    return this.adminService.getAllVolunteers();
  }

  @Patch('volunteers/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async verifyVolunteer(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.adminService.verifyVolunteer(id, isVerified);
  }

  @Delete('volunteers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteVolunteer(@Param('id') id: string) {
    return this.adminService.deleteVolunteer(id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getStats() {
    return this.adminService.getDashboardStats();
  }
}
