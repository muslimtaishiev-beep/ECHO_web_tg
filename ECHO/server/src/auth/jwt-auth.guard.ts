import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    // Allow login route to pass through check if it has Roles('guest')
    // Handled in controller level or decorator.
    return super.canActivate(context);
  }
}
