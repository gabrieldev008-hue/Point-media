import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readdirSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma.service';

describe('Authentication and RBAC against persistent SQLite', () => {
  let app: INestApplication;
  let db: PrismaService;
  let cookie: string;
  let candidateId: string;
  const suffix = randomUUID();
  const email = `candidate-${suffix}@example.test`;
  const password = 'Test-Password-Long-123!';
  const origin = 'http://localhost:5173';
  const createdIds: string[] = [];
  let temporaryDirectory: string | undefined;
  let databaseFile: string | undefined;

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !/^file:.+_test\.db$/.test(url)) {
      throw new Error('TEST_DATABASE_URL must identify a separate SQLite file ending in _test.db');
    }
    if (url === process.env.DATABASE_URL) throw new Error('Test and application databases must be different');
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'pointmedia-http-'));
    databaseFile = join(temporaryDirectory, 'auth_test.db');
    // Apply the versioned SQL to an isolated fixture without spawning a migration CLI.
    // The production migrate-deploy command remains a separate validation requirement.
    const fixture = new DatabaseSync(databaseFile);
    try {
      fixture.exec('PRAGMA foreign_keys = ON');
      const migrations = join(__dirname, '../prisma/migrations');
      for (const entry of readdirSync(migrations, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        fixture.exec(readFileSync(join(migrations, entry.name, 'migration.sql'), 'utf8'));
      }
    } finally { fixture.close(); }
    process.env.DATABASE_URL = `file:${databaseFile.replaceAll('\\', '/')}`;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-only-secret-'.repeat(5);
    process.env.WEB_ORIGIN = origin;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
  });
  afterAll(async () => {
    if (db) {
      await db.auditLog.deleteMany({ where: { OR: [{ actorId: { in: createdIds } }, { targetId: { in: createdIds } }] } });
      await db.user.deleteMany({ where: { id: { in: createdIds } } });
    }
    if (app) await app.close();
    if (databaseFile) unlinkSync(databaseFile);
    if (temporaryDirectory) rmdirSync(temporaryDirectory);
  });
  it('rejects unauthenticated requests and untrusted mutation origins', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer()).post('/api/auth/register').send({}).expect(403);
  });
  it('cannot self-register as admin or submit invalid fields', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').set('Origin', origin)
      .send({ email, password, name: 'Pessoa Teste', talentConsent: false, role: 'ADMIN' }).expect(400);
  });
  it('persists candidate profile and Argon2 password, without returning secrets', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/register').set('Origin', origin)
      .send({ email: email.toUpperCase(), password, name: 'Pessoa Teste', talentConsent: false }).expect(201);
    candidateId = response.body.id as string;
    createdIds.push(candidateId);
    expect(response.body).toMatchObject({ email, role: 'CANDIDATE', name: 'Pessoa Teste' });
    expect(response.body.passwordHash).toBeUndefined();
    const stored = await db.user.findUniqueOrThrow({ where: { id: candidateId }, include: { profile: true } });
    expect(stored.passwordHash).not.toBe(password);
    expect(await argon2.verify(stored.passwordHash, password)).toBe(true);
    expect(stored.profile?.talentConsentAt).toBeNull();
  });
  it('handles duplicate email case-insensitively', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').set('Origin', origin)
      .send({ email: email.toUpperCase(), password, name: 'Duplicado', talentConsent: true }).expect(409);
  });
  it('rejects invalid credentials and creates an HttpOnly session for valid login', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').set('Origin', origin)
      .send({ email, password: 'Incorrect-password-123' }).expect(401);
    const response = await request(app.getHttpServer()).post('/api/auth/login').set('Origin', origin)
      .send({ email, password }).expect(200);
    const header = response.headers['set-cookie'] as unknown as string[];
    expect(header[0]).toContain('HttpOnly');
    expect(header[0]).toContain('SameSite=Lax');
    cookie = header[0].split(';')[0];
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(200);
  });
  it('denies candidate access to admin endpoints and rejects foreign origins', async () => {
    await request(app.getHttpServer()).post('/api/admin/recruiters').set('Origin', origin).set('Cookie', cookie)
      .send({ email: `rh-${suffix}@example.test`, password }).expect(403);
    await request(app.getHttpServer()).post('/api/auth/logout').set('Origin', 'https://evil.test').set('Cookie', cookie).expect(403);
  });
  it('rejects altered tokens and expired persisted sessions', async () => {
    const jwt = cookie.slice('pm_session='.length);
    const [header, payload, signature] = jwt.split('.');
    const altered = `${header}.${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', `pm_session=${altered}`).expect(401);
    const session = await db.authSession.findFirstOrThrow({ where: { userId: candidateId } });
    await db.authSession.update({ where: { id: session.id }, data: { expiresAt: new Date(0) } });
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401);
    await db.authSession.update({ where: { id: session.id }, data: { expiresAt: session.expiresAt } });
  });
  it('admin creates recruiter, whose role cannot create other recruiters', async () => {
    const admin = await db.user.create({ data: { email: `admin-${suffix}@example.test`, role: 'ADMIN', passwordHash: await argon2.hash(password) } });
    createdIds.push(admin.id);
    const adminLogin = await request(app.getHttpServer()).post('/api/auth/login').set('Origin', origin)
      .send({ email: admin.email, password }).expect(200);
    const adminCookie = (adminLogin.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const recruiter = await request(app.getHttpServer()).post('/api/admin/recruiters').set('Origin', origin).set('Cookie', adminCookie)
      .send({ email: `rh-${suffix}@example.test`, password }).expect(201);
    createdIds.push(recruiter.body.id as string);
    expect(recruiter.body.role).toBe('RECRUITER');
    const rhLogin = await request(app.getHttpServer()).post('/api/auth/login').set('Origin', origin)
      .send({ email: recruiter.body.email, password }).expect(200);
    const rhCookie = (rhLogin.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    await request(app.getHttpServer()).post('/api/admin/recruiters').set('Origin', origin).set('Cookie', rhCookie)
      .send({ email: `other-${suffix}@example.test`, password }).expect(403);
  });
  it('rechecks active status and revokes sessions on logout', async () => {
    await db.user.update({ where: { id: candidateId }, data: { active: false } });
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401);
    await db.user.update({ where: { id: candidateId }, data: { active: true } });
    await request(app.getHttpServer()).post('/api/auth/logout').set('Origin', origin).set('Cookie', cookie).expect(204);
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401);
    expect(await db.auditLog.count({ where: { actorId: candidateId, action: 'LOGOUT' } })).toBe(1);
  });
  it('limits public registration attempts', async () => {
    // Four earlier register requests; the fifth still validates, sixth is throttled.
    await request(app.getHttpServer()).post('/api/auth/register').set('Origin', origin).send({}).expect(400);
    await request(app.getHttpServer()).post('/api/auth/register').set('Origin', origin).send({}).expect(429);
  });
});
