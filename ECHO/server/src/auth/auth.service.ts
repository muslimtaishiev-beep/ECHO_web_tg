import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVolunteerDto, LoginVolunteerDto, RegisterUserDto, LoginUserDto, CheckStatusDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterVolunteerDto) {
    const existing = await this.prisma.volunteer.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException('Username already taken');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.volunteer.findUnique({
        where: { email: dto.email }
      });
      if (existingEmail) {
        throw new ConflictException('Email already taken');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const volunteer = await this.prisma.volunteer.create({
      data: {
        username: dto.username,
        passwordHash,
        displayName: dto.displayName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        age: dto.age,
        telegramId: dto.telegramId ? BigInt(dto.telegramId) : null,
      },
    });

    const token = this.jwtService.sign({
      sub: volunteer.id,
      username: volunteer.username,
      role: 'volunteer',
    });

    return {
      access_token: token,
      volunteer: {
        id: volunteer.id,
        username: volunteer.username,
        displayName: volunteer.displayName,
      },
    };
  }

  async login(dto: LoginVolunteerDto) {
    const volunteer = await this.prisma.volunteer.findUnique({
      where: { username: dto.username },
    });

    if (!volunteer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      volunteer.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Mark online
    await this.prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { isOnline: true },
    });

    const token = this.jwtService.sign({
      sub: volunteer.id,
      username: volunteer.username,
      role: 'volunteer',
    });

    return {
      access_token: token,
      volunteer: {
        id: volunteer.id,
        username: volunteer.username,
        displayName: volunteer.displayName,
      },
    };
  }

  async validateVolunteer(payload: { sub: string }) {
    return this.prisma.volunteer.findUnique({
      where: { id: payload.sub },
    });
  }

  async registerUser(dto: RegisterUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { nickname: dto.nickname },
    });

    if (existing) {
      throw new ConflictException('Nickname already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        nickname: dto.nickname,
        passwordHash,
        isApproved: false, // Default to not approved for teenagers
      },
    });

    // Provide token or just response, since they shouldn't login until approved
    return {
      message: 'Registration pending approval. Please check status later.',
      user: {
        id: user.id,
        nickname: user.nickname,
        isApproved: user.isApproved,
      },
    };
  }

  async checkUserStatus(dto: CheckStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { nickname: dto.nickname },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isApproved || !user.specialId) {
      return { status: 'pending', message: 'Your account is still pending approval.' };
    }

    return {
      status: 'approved',
      specialId: user.specialId,
      message: 'Your account has been approved!',
    };
  }

  async loginUser(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { specialId: dto.specialId },
    });

    if (!user || (!user.isApproved)) {
      throw new UnauthorizedException('Invalid ID or account pending approval');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      nickname: user.nickname,
      specialId: user.specialId,
      role: 'user',
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        nickname: user.nickname,
        specialId: user.specialId,
      },
    };
  }
}
