import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterVolunteerDto,
  LoginVolunteerDto,
  RegisterUserDto,
  LoginUserDto,
  CheckStatusDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─────────────────────────────────────────────
  // VOLUNTEER AUTH
  // ─────────────────────────────────────────────

  async register(dto: RegisterVolunteerDto) {
    const existing = await this.prisma.volunteer.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username already taken');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.volunteer.findUnique({
        where: { email: dto.email },
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

    this.eventEmitter.emit('volunteer.registered', {
      id: volunteer.id,
      username: volunteer.username,
      displayName: volunteer.displayName,
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      phone: volunteer.phone,
      telegramId: volunteer.telegramId ? volunteer.telegramId.toString() : null,
    });

    // Do NOT issue access_token for unverified volunteers
    return {
      access_token: null,
      volunteer: {
        id: volunteer.id,
        username: volunteer.username,
        displayName: volunteer.displayName,
        isVerified: volunteer.isVerified,
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

    const passwordValid = await bcrypt.compare(dto.password, volunteer.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!volunteer.isVerified) {
      throw new ForbiddenException('Your account is pending admin approval.');
    }

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
        isVerified: volunteer.isVerified,
      },
    };
  }

  async validateVolunteer(payload: { sub: string }) {
    return this.prisma.volunteer.findUnique({ where: { id: payload.sub } });
  }

  // ─────────────────────────────────────────────
  // USER (TEENAGER) AUTH
  // ─────────────────────────────────────────────

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
        isApproved: false,
      },
    });

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

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
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

    if (!user || !user.isApproved) {
      throw new UnauthorizedException('Invalid ID or account pending approval');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
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

  // ─────────────────────────────────────────────
  // TELEGRAM ↔ WEB ACCOUNT LINKING
  // ─────────────────────────────────────────────

  /**
   * Called from TelegramService when a user sets a password (/password command).
   * Creates or updates a User record linked to the given telegramId.
   */
  async linkTelegramToUser(telegramId: bigint, nickname: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if a User with this telegramId already exists
    const existingByTg = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingByTg) {
      // Update the password
      await this.prisma.user.update({
        where: { telegramId },
        data: { passwordHash },
      });
      return;
    }

    // Check if the nickname is taken by another (non-linked) user
    const existingByNick = await this.prisma.user.findUnique({
      where: { nickname },
    });

    if (existingByNick && existingByNick.telegramId !== null) {
      throw new ConflictException('Nickname already taken by another user');
    }

    if (existingByNick) {
      // Link telegram to the existing nickname account
      await this.prisma.user.update({
        where: { nickname },
        data: { telegramId, passwordHash },
      });
    } else {
      // Create a brand new user linked to this Telegram account
      await this.prisma.user.create({
        data: {
          nickname,
          passwordHash,
          telegramId,
          isApproved: true, // Telegram users are auto-approved
        },
      });
    }
  }

  /**
   * Allows a Telegram-linked user to log in via the web using their nickname + password.
   */
  async loginUserByNickname(nickname: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { nickname } });

    if (!user || !user.isApproved) {
      throw new UnauthorizedException('Account not found or pending approval');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
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
        telegramLinked: user.telegramId !== null,
      },
    };
  }
}
