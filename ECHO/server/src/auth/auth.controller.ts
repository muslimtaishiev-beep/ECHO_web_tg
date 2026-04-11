import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterVolunteerDto, LoginVolunteerDto, RegisterUserDto, LoginUserDto, CheckStatusDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterVolunteerDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginVolunteerDto) {
    return this.authService.login(dto);
  }

  @Post('user/register')
  registerUser(@Body() dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @Post('user/status')
  checkUserStatus(@Body() dto: CheckStatusDto) {
    return this.authService.checkUserStatus(dto);
  }

  @Post('user/login')
  loginUser(@Body() dto: LoginUserDto) {
    return this.authService.loginUser(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }
}
