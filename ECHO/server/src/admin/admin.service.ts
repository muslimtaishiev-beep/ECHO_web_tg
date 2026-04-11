import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Seed the first admin if none exists
   */
  async onModuleInit() {
    const adminCount = await this.prisma.admin.count();
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await this.prisma.admin.create({
        data: {
          username: 'admin',
          passwordHash,
          displayName: 'System Administrator',
        },
      });
      console.log('✅ Default admin created: admin / admin123');
    }
  }

  async login(dto: { username: string; password: string; totpCode?: string }) {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    if (admin.isTwoFactorEnabled) {
      if (!dto.totpCode) {
        throw new UnauthorizedException('2FA code required');
      }
      if (!admin.twoFactorSecret) {
        throw new UnauthorizedException('2FA secret missing');
      }
      const isBlockValid = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: dto.totpCode,
        window: 1, // allow a little drift
      });
      if (!isBlockValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    const token = this.jwtService.sign({
      sub: admin.id,
      username: admin.username,
      role: 'admin',
    });

    return {
      access_token: token,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.displayName,
        isTwoFactorEnabled: admin.isTwoFactorEnabled,
      },
    };
  }

  async setup2FA(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException();

    const secret = speakeasy.generateSecret({
      name: `ECHO Admin (${admin.username})`,
    });

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { twoFactorSecret: secret.base32 },
    });

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate OTP auth URL');
    }
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
    };
  }

  async enable2FA(adminId: string, token: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.twoFactorSecret) {
      throw new UnauthorizedException('2FA setup not initiated');
    }

    const isValid = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { isTwoFactorEnabled: true },
    });

    return { success: true };
  }

  async getAllVolunteers() {
    const volunteers = await this.prisma.volunteer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        telegramId: true,
        isVerified: true,
        isOnline: true,
        level: true,
        rating: true,
        hoursCount: true,
        totalChats: true,
        createdAt: true,
      },
    });

    // BigInt serialization fix
    return volunteers.map((v) => ({
      ...v,
      telegramId: v.telegramId ? v.telegramId.toString() : null,
    }));
  }

  async getLiveChats() {
    return this.prisma.chatRoom.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        volunteer: { select: { displayName: true } }
      }
    });
  }

  async getPendingUsers() {
    return this.prisma.user.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nickname: true,
        createdAt: true,
      }
    });
  }

  async approveUser(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isApproved) throw new UnauthorizedException('User already approved');

    // Generate special ID: ECHO-XXXX
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const specialId = `ECHO-${randomNum}`;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isApproved: true,
        specialId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'APPROVE_USER',
        target: updatedUser.nickname,
        targetId: updatedUser.id,
        details: `Approved user with specialId: ${specialId}`,
      }
    });

    return updatedUser;
  }

  async verifyVolunteer(id: string, isVerified: boolean, adminId: string) {
    const volunteer = await this.prisma.volunteer.update({
      where: { id },
      data: { isVerified },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'VERIFY_VOLUNTEER',
        target: volunteer.username,
        targetId: volunteer.id,
        details: isVerified ? 'Verified volunteer' : 'Unverified volunteer',
      }
    });

    return volunteer;
  }

  async deleteVolunteer(id: string, adminId: string) {
    const volunteer = await this.prisma.volunteer.findUnique({ where: { id } });
    
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action: 'DELETE_VOLUNTEER',
        target: volunteer?.username || id,
        targetId: id,
        details: `Deleted volunteer: ${volunteer?.displayName || id}`,
      }
    });

    return this.prisma.volunteer.delete({
      where: { id },
    });
  }

  async getAuditLogs(search?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { details: { contains: search } },
        { target: { contains: search } }
      ];
    }
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100 // limit to last 100 for performance
    });
  }

  async getDashboardStats() {
    const volunteers = await this.prisma.volunteer.count();
    const verifiedVolunteers = await this.prisma.volunteer.count({
      where: { isVerified: true },
    });
    const totalRooms = await this.prisma.chatRoom.count();
    const activeRooms = await this.prisma.chatRoom.count({
      where: { status: 'active' },
    });

    // Average rating
    const aggregate = await this.prisma.volunteer.aggregate({
      _avg: { rating: true },
    });

    return {
      volunteers,
      verifiedVolunteers,
      totalRooms,
      activeRooms,
      averageRating: aggregate._avg.rating || 0,
    };
  }
}
