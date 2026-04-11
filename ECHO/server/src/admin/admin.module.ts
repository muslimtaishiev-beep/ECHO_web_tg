import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtModule } from '@nestjs/jwt';
import { ExportService } from './export.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'echo-fallback-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AdminService, ExportService],
  controllers: [AdminController],
  exports: [AdminService, ExportService],
})
export class AdminModule {}
