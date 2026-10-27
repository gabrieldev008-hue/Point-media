import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser, Role } from '@pointmedia/shared';
export const PUBLIC = 'auth:public';
export const ROLES = 'auth:roles';
export const Public = () => SetMetadata(PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
export type AuthenticatedRequest = Request & { user: CurrentUser; sessionId: string };
export const Actor = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUser =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
