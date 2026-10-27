import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { CurrentUser } from '@pointmedia/shared';
import { PrismaService } from '../prisma.service';
import { PrivateStorage } from './private-storage';
import { ResumeUpload, validateResume } from './resume-validation';
const metadata = { id: true, mimeType: true, size: true, createdAt: true } as const;
@Injectable()
export class ResumesService {
  private readonly logger = new Logger('PrivateStorage');
  constructor(private readonly db: PrismaService, private readonly storage: PrivateStorage) {}
  private async cleanup(key: string) {
    try { await this.storage.remove(key); }
    catch { this.logger.error('Private file cleanup failed; storage maintenance required'); }
  }
  async upload(userId: string, file: ResumeUpload | undefined) {
    const mimeType = validateResume(file);
    const bytes = file!.buffer;
    const storageKey = randomUUID();
    await this.storage.put(storageKey, bytes);
    try {
      const result = await this.db.$transaction(async (tx) => {
        const previous = await tx.resumeFile.findUnique({ where: { userId } });
        const data = { storageKey, mimeType, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), createdAt: new Date() };
        const resume = await tx.resumeFile.upsert({ where: { userId }, create: { userId, ...data }, update: data, select: metadata });
        await tx.auditLog.create({ data: { actorId: userId, targetId: resume.id, action: 'RESUME_UPLOADED' } });
        return { resume, previous: previous?.storageKey };
      });
      if (result.previous) await this.cleanup(result.previous);
      return result.resume;
    } catch (error) { await this.cleanup(storageKey); throw error; }
  }
  async download(id: string, actor: CurrentUser) {
    const resume = await this.db.resumeFile.findUnique({ where: { id } });
    if (!resume || (actor.role === 'CANDIDATE' && resume.userId !== actor.id)) throw new NotFoundException('Currículo não encontrado');
    let bytes: Buffer;
    try { bytes = await this.storage.get(resume.storageKey); }
    catch { throw new NotFoundException('Arquivo não disponível'); }
    await this.db.auditLog.create({ data: { actorId: actor.id, targetId: id, action: 'RESUME_DOWNLOADED' } });
    return { bytes, mimeType: resume.mimeType };
  }
  async remove(userId: string) {
    const previous = await this.db.$transaction(async (tx) => {
      const resume = await tx.resumeFile.findUnique({ where: { userId } });
      if (!resume) throw new NotFoundException('Currículo não encontrado');
      await tx.resumeFile.delete({ where: { userId } });
      await tx.auditLog.create({ data: { actorId: userId, targetId: resume.id, action: 'RESUME_DELETED' } });
      return resume.storageKey;
    });
    await this.cleanup(previous);
  }
}
