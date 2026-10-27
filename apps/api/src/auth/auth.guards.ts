import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { permits, trustedOrigin, type Role } from '@pointmedia/shared';
import { ENV, type Environment } from '../config';
import { AuthService } from './auth.service';
import { AuthenticatedRequest, PUBLIC, ROLES } from './auth.decorators';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Environment) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !trustedOrigin(request.headers.origin, this.env.WEB_ORIGIN)) {
      throw new ForbiddenException('Origem não autorizada');
    }
    return true;
  }
}
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.pm_session;
    if (typeof token !== 'string') throw new UnauthorizedException('Autenticação necessária');
    Object.assign(request, await this.auth.authenticate(token));
    return true;
  }
}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES, [context.getHandler(), context.getClass()]);
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user || !permits(user.role, allowed ?? [])) throw new ForbiddenException('Acesso não autorizado');
    return true;
  }
}
