import {
  Injectable,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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

  async login(dto: { username: string; password: string }) {
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
      },
    };
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

  async verifyVolunteer(id: string, isVerified: boolean) {
    return this.prisma.volunteer.update({
      where: { id },
      data: { isVerified },
    });
  }

  async deleteVolunteer(id: string) {
    return this.prisma.volunteer.delete({
      where: { id },
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
