import { IsString, MinLength } from 'class-validator';

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
}

export class LoginVolunteerDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
