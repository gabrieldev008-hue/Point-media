import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readdirSync, readFileSync, existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { crc32 } from 'node:zlib';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma.service';
import { DOCX_MIME, PDF_MIME } from '../src/files/resume-validation';

function docx() {
  const files = [
    ['[Content_Types].xml', '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<Relationships/>'],
    ['word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'],
  ];
  const locals: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const filename = Buffer.from(name), body = Buffer.from(text);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc32(body), 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(filename.length, 26);
    const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc32(body), 16); directory.writeUInt32LE(body.length, 20); directory.writeUInt32LE(body.length, 24); directory.writeUInt16LE(filename.length, 28); directory.writeUInt32LE(offset, 42);
    locals.push(local, filename, body); central.push(directory, filename); offset += local.length + filename.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
describe('Phase 2 — profiles, private resumes and job lifecycle', () => {
  let app: INestApplication, db: PrismaService, directory: string;
  let candidate: string, other: string, recruiter: string, candidateId: string;
  let jobId: string, resumeId: string;
  const password = 'Phase2-Test-Password123!';
  const origin = 'http://localhost:5173';
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type /Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  const jobInput = () => ({ title: 'Designer de testes', description: 'Uma oportunidade fictícia para validar o fluxo completo.', department: 'Design',
    seniority: 'SENIOR', workMode: 'REMOTE', salaryMinCents: 300000, salaryMaxCents: 800000,
    opensAt: new Date(Date.now() - 3600000).toISOString(), closesAt: new Date(Date.now() + 86400000).toISOString(),
    requiredSkills: ['Figma'], desiredSkills: ['React'], essentials: ['Portfólio'], desirables: ['Inglês'],
    technologyWeight: 50, seniorityWeight: 30, salaryWeight: 20 });
  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'pointmedia-phase2-'));
    const file = join(directory, 'phase2_test.db');
    const fixture = new DatabaseSync(file);
    try {
      fixture.exec('PRAGMA foreign_keys = ON');
      const migrations = join(__dirname, '../prisma/migrations');
      for (const entry of readdirSync(migrations, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) fixture.exec(readFileSync(join(migrations, entry.name, 'migration.sql'), 'utf8'));
    } finally { fixture.close(); }
    Object.assign(process.env, { DATABASE_URL: `file:${file.replaceAll('\\', '/')}`, STORAGE_DIRECTORY: join(directory, 'files'), NODE_ENV: 'test', JWT_SECRET: 'phase2-secret-'.repeat(6), WEB_ORIGIN: origin });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init(); db = app.get(PrismaService);
    const hash = await argon2.hash(password);
    const cookies: string[] = [];
    for (const role of ['CANDIDATE', 'CANDIDATE', 'RECRUITER'] as const) {
      const user = await db.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: hash, role,
        ...(role === 'CANDIDATE' ? { profile: { create: { name: 'Pessoa fictícia' } } } : {}) } });
      if (!candidateId) candidateId = user.id;
      const login = await request(app.getHttpServer()).post('/api/auth/login').set('Origin', origin).send({ email: user.email, password }).expect(200);
      cookies.push((login.headers['set-cookie'] as unknown as string[])[0].split(';')[0]);
    }
    [candidate, other, recruiter] = cookies;
  });
  afterAll(async () => {
    if (app) await app.close();
    if (directory) {
      const storage = join(directory, 'files');
      if (existsSync(storage)) { for (const name of readdirSync(storage)) unlinkSync(join(storage, name)); rmdirSync(storage); }
      for (const name of readdirSync(directory)) unlinkSync(join(directory, name));
      rmdirSync(directory);
    }
  });
  it('saves professional profile, normalized skills, education and experience transactionally', async () => {
    const profile = await request(app.getHttpServer()).put('/api/candidates/me').set('Cookie', candidate).set('Origin', origin).send({
      name: 'Talento de teste', phone: '+55 11 99999-9999', location: 'Tatuí', seniority: 'SENIOR', salaryCents: 500000, talentConsent: true,
      linkedIn: 'https://www.linkedin.com/in/teste', skills: ['React', ' react ', 'Figma'],
      experiences: [{ company: 'Empresa fictícia', title: 'Designer', startsAt: '2024-01-01', endsAt: null }],
      education: [{ institution: 'Faculdade fictícia', course: 'Design', startsAt: '2020-01-01', endsAt: '2023-12-01' }],
    }).expect(200);
    expect(profile.body.skills).toHaveLength(2); expect(profile.body.experiences).toHaveLength(1); expect(profile.body.talentConsentAt).not.toBeNull();
    expect(profile.body.user.passwordHash).toBeUndefined();
    const view = await request(app.getHttpServer()).get(`/api/candidates/${profile.body.id}`).set('Cookie', recruiter).expect(200);
    expect(view.body.name).toBe('Talento de teste');
    await request(app.getHttpServer()).get(`/api/candidates/${profile.body.id}`).set('Cookie', other).expect(403);
  });
  it('rejects invalid periods, salaries, links and candidate access to management', async () => {
    await request(app.getHttpServer()).put('/api/candidates/me').set('Cookie', candidate).set('Origin', origin)
      .send({ name: 'Pessoa Teste', talentConsent: false, experiences: [{ company: 'Teste', title: 'Teste', startsAt: '2025-01-01', endsAt: '2024-01-01' }] }).expect(400);
    await request(app.getHttpServer()).put('/api/candidates/me').set('Cookie', candidate).set('Origin', origin).send({ name: 'Pessoa Teste', talentConsent: false, salaryCents: -1 }).expect(400);
    await request(app.getHttpServer()).put('/api/candidates/me').set('Cookie', candidate).set('Origin', origin).send({ name: 'Pessoa Teste', talentConsent: false, portfolio: 'javascript:alert(1)' }).expect(400);
    await request(app.getHttpServer()).get('/api/candidates').set('Cookie', candidate).expect(403);
    await request(app.getHttpServer()).post('/api/recruitment/jobs').set('Origin', origin).set('Cookie', candidate).send(jobInput()).expect(403);
    const result = await request(app.getHttpServer()).get('/api/candidates?pageSize=1').set('Cookie', recruiter).expect(200);
    expect(result.body.items).toHaveLength(1); expect(result.body.total).toBe(2);
  });
  it('validates configurable weights, salary range and timezone-aware deadlines', async () => {
    for (const input of [{ ...jobInput(), salaryWeight: 5 }, { ...jobInput(), salaryMaxCents: 1 }, { ...jobInput(), closesAt: '2026-01-01T12:00:00' }]) {
      await request(app.getHttpServer()).post('/api/recruitment/jobs').set('Origin', origin).set('Cookie', recruiter).send(input).expect(400);
    }
  });
  it('creates and edits drafts, increments criteria version and prevents stale updates', async () => {
    const created = await request(app.getHttpServer()).post('/api/recruitment/jobs').set('Origin', origin).set('Cookie', recruiter).send(jobInput()).expect(201);
    jobId = created.body.id as string;
    await request(app.getHttpServer()).get(`/api/jobs/${jobId}`).expect(404);
    const updated = await request(app.getHttpServer()).put(`/api/recruitment/jobs/${jobId}`).set('Origin', origin).set('Cookie', recruiter)
      .send({ ...jobInput(), revision: 1, technologyWeight: 60, seniorityWeight: 20 }).expect(200);
    expect(updated.body.criteriaVersion).toBe(2); expect(updated.body.revision).toBe(2);
    await request(app.getHttpServer()).put(`/api/recruitment/jobs/${jobId}`).set('Origin', origin).set('Cookie', recruiter).send({ ...jobInput(), revision: 1 }).expect(409);
  });
  it('publishes real vacancies without exposing internal weights or recruiter identity', async () => {
    await request(app.getHttpServer()).patch(`/api/recruitment/jobs/${jobId}/status`).set('Origin', origin).set('Cookie', recruiter).send({ status: 'PUBLISHED', revision: 2 }).expect(200);
    const published = await request(app.getHttpServer()).get(`/api/jobs/${jobId}`).expect(200);
    expect(published.body.technologyWeight).toBeUndefined(); expect(published.body.createdById).toBeUndefined();
    expect(published.body.requirements).toHaveLength(4);
    await request(app.getHttpServer()).delete(`/api/recruitment/jobs/${jobId}`).set('Origin', origin).set('Cookie', recruiter).expect(400);
  });
  it('enforces exact closure time and forbids reopening or editing closed vacancies', async () => {
    const time = new Date(Date.now() - 10);
    await db.jobOpening.update({ where: { id: jobId }, data: { closesAt: time } });
    await request(app.getHttpServer()).get(`/api/jobs/${jobId}`).expect(404);
    const closed = await request(app.getHttpServer()).get('/api/recruitment/jobs?status=CLOSED').set('Cookie', recruiter).expect(200);
    expect(closed.body.items[0].status).toBe('CLOSED');
    await request(app.getHttpServer()).put(`/api/recruitment/jobs/${jobId}`).set('Origin', origin).set('Cookie', recruiter).send({ ...jobInput(), revision: 3 }).expect(400);
    await request(app.getHttpServer()).patch(`/api/recruitment/jobs/${jobId}/status`).set('Origin', origin).set('Cookie', recruiter).send({ status: 'PUBLISHED', revision: 3 }).expect(400);
  });
  it('supports draft deletion and cancellation with audit', async () => {
    const created = await request(app.getHttpServer()).post('/api/recruitment/jobs').set('Origin', origin).set('Cookie', recruiter).send(jobInput()).expect(201);
    await request(app.getHttpServer()).delete(`/api/recruitment/jobs/${created.body.id}`).set('Origin', origin).set('Cookie', recruiter).expect(204);
    expect(await db.auditLog.count({ where: { targetId: created.body.id, action: 'JOB_DELETED' } })).toBe(1);
  });
  it('hides scheduled vacancies until opening and supports cancellation', async () => {
    const input = { ...jobInput(), opensAt: new Date(Date.now() + 3600000).toISOString() };
    const job = await request(app.getHttpServer()).post('/api/recruitment/jobs').set('Origin', origin).set('Cookie', recruiter).send(input).expect(201);
    await request(app.getHttpServer()).patch(`/api/recruitment/jobs/${job.body.id}/status`).set('Origin', origin).set('Cookie', recruiter).send({ status: 'PUBLISHED', revision: 1 }).expect(200);
    await request(app.getHttpServer()).get(`/api/jobs/${job.body.id}`).expect(404);
    const cancelled = await request(app.getHttpServer()).patch(`/api/recruitment/jobs/${job.body.id}/status`).set('Origin', origin).set('Cookie', recruiter).send({ status: 'CANCELLED', revision: 2 }).expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    await request(app.getHttpServer()).get(`/api/jobs/${job.body.id}`).expect(404);
  });
  it('rejects spoofed extensions, MIME mismatches, fake DOCX and oversized uploads', async () => {
    const corrupted = docx(); corrupted[70] ^= 1;
    for (const [filename, contentType, content] of [['cv.exe', PDF_MIME, pdf], ['cv.pdf', 'text/plain', pdf], ['cv.pdf', PDF_MIME, Buffer.from('not a pdf')], ['cv.docx', DOCX_MIME, Buffer.from('PK fake zip')], ['cv.docx', DOCX_MIME, corrupted]] as const) {
      await request(app.getHttpServer()).post('/api/candidates/me/resume').set('Origin', origin).set('Cookie', candidate).attach('file', content, { filename, contentType }).expect(400);
    }
    await request(app.getHttpServer()).post('/api/candidates/me/resume').set('Origin', origin).set('Cookie', candidate).attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'cv.pdf', contentType: PDF_MIME }).expect(413);
  });
  it('stores private PDF, checks ownership, and authorizes recruiter downloads', async () => {
    const upload = await request(app.getHttpServer()).post('/api/candidates/me/resume').set('Origin', origin).set('Cookie', candidate).attach('file', pdf, { filename: 'cv.pdf', contentType: PDF_MIME }).expect(201);
    resumeId = upload.body.id as string; expect(upload.body.storageKey).toBeUndefined();
    await request(app.getHttpServer()).get(`/api/resumes/${resumeId}`).expect(401);
    await request(app.getHttpServer()).get(`/api/resumes/${resumeId}`).set('Cookie', other).expect(404);
    const download = await request(app.getHttpServer()).get(`/api/resumes/${resumeId}`).set('Cookie', recruiter).expect(200);
    expect(download.headers['content-disposition']).toContain('attachment'); expect(download.body).toEqual(pdf);
    expect(readdirSync(join(directory, 'files'))).toHaveLength(1);
  });
  it('accepts real DOCX structure, replaces the private file, then deletes it', async () => {
    await request(app.getHttpServer()).post('/api/candidates/me/resume').set('Origin', origin).set('Cookie', candidate).attach('file', docx(), { filename: 'cv.docx', contentType: DOCX_MIME }).expect(201);
    expect(readdirSync(join(directory, 'files'))).toHaveLength(1);
    const result = await request(app.getHttpServer()).get(`/api/resumes/${resumeId}`).set('Cookie', candidate).expect(200);
    expect(result.headers['content-type']).toContain(DOCX_MIME);
    await request(app.getHttpServer()).delete('/api/candidates/me/resume').set('Origin', origin).set('Cookie', candidate).expect(204);
    expect(readdirSync(join(directory, 'files'))).toHaveLength(0);
    await request(app.getHttpServer()).get(`/api/resumes/${resumeId}`).set('Cookie', candidate).expect(404);
  });
  it('requires current password for candidate deletion and revokes all sessions', async () => {
    await request(app.getHttpServer()).delete('/api/candidates/me').set('Origin', origin).set('Cookie', candidate).send({ password: 'Incorrect-password123!' }).expect(401);
    await request(app.getHttpServer()).delete('/api/candidates/me').set('Origin', origin).set('Cookie', candidate).send({ password }).expect(204);
    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', candidate).expect(401);
    expect(await db.user.findUnique({ where: { id: candidateId } })).toBeNull();
  });
});
