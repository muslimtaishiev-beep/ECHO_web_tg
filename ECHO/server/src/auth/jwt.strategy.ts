import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'echo-fallback-secret',
    });
  }

  async validate(payload: { sub: string; username?: string; nickname?: string; role: string }) {
    if (payload.role === 'admin') {
      return { id: payload.sub, username: payload.username, role: 'admin' };
    }
    
    if (payload.role === 'user') {
      // In a real app we might fetch the user from DB to ensure they still exist or are approved
      return { id: payload.sub, nickname: payload.nickname, role: 'user' };
    }

    const volunteer = await this.authService.validateVolunteer(payload);
    // STRCIT AUTH FIX: Volunteer MUST be verified to be validated by JWT
    if (!volunteer || !volunteer.isVerified) return null;
    return {
      id: volunteer.id,
      username: volunteer.username,
      role: payload.role,
    };
  }
}
