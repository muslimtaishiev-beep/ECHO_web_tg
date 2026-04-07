import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVolunteerDto, LoginVolunteerDto } from './dto/auth.dto';

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

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const volunteer = await this.prisma.volunteer.create({
      data: {
        username: dto.username,
        passwordHash,
        displayName: dto.displayName,
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
}
