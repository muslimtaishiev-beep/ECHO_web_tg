import { IsString, MinLength, IsOptional, IsEmail, IsInt } from 'class-validator';

export class RegisterVolunteerDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  telegramId?: string;
}

export class LoginVolunteerDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class RegisterUserDto {
  @IsString()
  @MinLength(3)
  nickname: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class CheckStatusDto {
  @IsString()
  nickname: string;

  @IsString()
  password: string;
}

export class LoginUserDto {
  @IsString()
  specialId: string;

  @IsString()
  password: string;
}
