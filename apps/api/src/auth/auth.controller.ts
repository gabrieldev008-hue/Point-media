import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import type { CurrentUser } from '@pointmedia/shared';
import { ENV, type Environment } from '../config';
import { Actor, type AuthenticatedRequest, Public, Roles } from './auth.decorators';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService, SESSION_SECONDS } from './auth.service';

@ApiTags('auth') @ApiCookieAuth('pm_session') @Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, @Inject(ENV) private readonly env: Environment) {}
  @Public() @Post('register') @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Public() @Post('login') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    response.cookie('pm_session', result.token, { ...this.cookieOptions(), maxAge: SESSION_SECONDS * 1000 });
    response.setHeader('Cache-Control', 'no-store');
    return result.user;
  }
  @Roles('CANDIDATE', 'RECRUITER', 'ADMIN') @Get('me')
  me(@Actor() user: CurrentUser, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return user;
  }
  @Roles('CANDIDATE', 'RECRUITER', 'ADMIN') @Post('logout') @HttpCode(204)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.user.id, request.sessionId);
    response.clearCookie('pm_session', this.cookieOptions());
  }
  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' };
  }
}
@ApiTags('admin') @ApiCookieAuth('pm_session') @Roles('ADMIN') @Controller('admin')
export class AdminController {
  constructor(private readonly auth: AuthService) {}
  @Post('recruiters')
  createRecruiter(@Body() dto: LoginDto, @Actor() actor: CurrentUser) {
    return this.auth.createRecruiter(dto, actor.id);
  }
}
