import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { CurrentUser } from '@pointmedia/shared';
import { PrismaService } from '../prisma.service';
import { ENV, type Environment } from '../config';
import { LoginDto, RegisterDto } from './auth.dto';

export const SESSION_SECONDS = 15 * 60;
const publicSelect = { id: true, email: true, role: true, profile: { select: { name: true } } } as const;
type PublicRecord = Prisma.UserGetPayload<{ select: typeof publicSelect }>;
export function toCurrentUser(user: PublicRecord): CurrentUser {
  return { id: user.id, email: user.email, role: user.role, name: user.profile?.name ?? null };
}
@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash(randomUUID(), { type: argon2.argon2id });
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Environment,
  ) {}

  async register(dto: RegisterDto): Promise<CurrentUser> {
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: dto.email, passwordHash, role: Role.CANDIDATE,
            profile: { create: { name: dto.name, talentConsentAt: dto.talentConsent ? new Date() : null } } },
          select: publicSelect,
        });
        await tx.auditLog.create({ data: { actorId: user.id, action: 'USER_REGISTERED', targetId: user.id } });
        return toCurrentUser(user);
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async login(dto: LoginDto): Promise<{ token: string; user: CurrentUser }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: { profile: true } });
    const matches = await argon2.verify(user?.passwordHash ?? await this.dummyHash, dto.password);
    if (!matches || !user?.active) throw new UnauthorizedException('E-mail ou senha inválidos');
    const sessionId = randomUUID();
    const token = await this.jwt.signAsync({}, {
      secret: this.env.JWT_SECRET, algorithm: 'HS256', subject: user.id, jwtid: sessionId,
      issuer: 'pointmedia-api', audience: 'pointmedia-web', expiresIn: SESSION_SECONDS,
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.create({ data: { id: sessionId, userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } });
      await tx.auditLog.create({ data: { actorId: user.id, action: 'LOGIN', targetId: sessionId } });
    });
    return { token, user: toCurrentUser(user) };
  }

  async authenticate(token: string): Promise<{ user: CurrentUser; sessionId: string }> {
    let payload: { sub?: string; jti?: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: string; jti?: string }>(token, {
        secret: this.env.JWT_SECRET, algorithms: ['HS256'], issuer: 'pointmedia-api', audience: 'pointmedia-web',
      });
    } catch { throw new UnauthorizedException('Sessão inválida ou expirada'); }
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!payload.sub || !payload.jti || !uuid.test(payload.sub) || !uuid.test(payload.jti)) {
      throw new UnauthorizedException('Sessão inválida');
    }
    const session = await this.prisma.authSession.findUnique({ where: { id: payload.jti },
      include: { user: { include: { profile: true } } } });
    if (!session || session.userId !== payload.sub || session.revokedAt ||
        session.expiresAt.getTime() <= Date.now() || !session.user.active) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    return { user: toCurrentUser(session.user), sessionId: session.id };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: userId, action: 'LOGOUT', targetId: sessionId } });
    });
  }

  async createRecruiter(dto: LoginDto, actorId: string): Promise<CurrentUser> {
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email: dto.email, passwordHash, role: Role.RECRUITER }, select: publicSelect });
        await tx.auditLog.create({ data: { actorId, action: 'RECRUITER_CREATED', targetId: user.id } });
        return toCurrentUser(user);
      });
    } catch (error) { this.rethrowDuplicate(error); }
  }
  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('E-mail já cadastrado');
    }
    throw error;
  }
}
