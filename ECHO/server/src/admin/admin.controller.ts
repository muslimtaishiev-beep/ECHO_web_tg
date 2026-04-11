import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly exportService: ExportService,
  ) {}

  // Login is UNGUARDED — no JWT required
  @Post('login')
  async login(@Body() dto: { username: string; password: string; totpCode?: string }) {
    return this.adminService.login(dto);
  }

  @Post('setup-2fa')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async setup2FA(@Req() req) {
    return this.adminService.setup2FA(req.user.id);
  }

  @Post('verify-2fa')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async verify2FA(@Req() req, @Body('token') token: string) {
    return this.adminService.enable2FA(req.user.id, token);
  }

  @Get('volunteers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getVolunteers() {
    return this.adminService.getAllVolunteers();
  }

  @Get('chats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getChats() {
    return this.adminService.getLiveChats();
  }

  @Get('users/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getPendingUsers() {
    return this.adminService.getPendingUsers();
  }

  @Patch('users/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async approveUser(@Req() req, @Param('id') id: string) {
    return this.adminService.approveUser(id, req.user.id);
  }

  @Patch('volunteers/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async verifyVolunteer(
    @Req() req,
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.adminService.verifyVolunteer(id, isVerified, req.user.id);
  }

  @Delete('volunteers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteVolunteer(@Req() req, @Param('id') id: string) {
    return this.adminService.deleteVolunteer(id, req.user.id);
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAuditLogs(
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAuditLogs(search, startDate, endDate);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // Should ideally be superadmin according to spec, but we only have admin role right now
  async exportData(@Query('format') format: 'json' | 'csv' = 'csv', @Res() res: Response) {
    const data = await this.exportService.exportData(format);
    
    if (format === 'json') {
      res.header('Content-Type', 'application/json');
      res.attachment('ECHO_export.json');
    } else {
      res.header('Content-Type', 'text/csv');
      res.attachment('ECHO_export.csv');
    }
    
    return res.send(data);
  }
}
