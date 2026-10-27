import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma.service';
import { normalizedSkills } from '../common/skills';
import { ProfileDto } from './profile.dto';
import { PaginationDto } from '../common/pagination.dto';
import { PrivateStorage } from '../files/private-storage';
const include = {
  skills: { include: { skill: true } }, experiences: { orderBy: { startsAt: 'desc' as const } },
  education: { orderBy: { startsAt: 'desc' as const } },
  user: { select: { email: true, resume: { select: { id: true, mimeType: true, size: true, createdAt: true } } } },
};
@Injectable()
export class CandidatesService {
  constructor(private readonly db: PrismaService, private readonly storage: PrivateStorage) {}
  async remove(userId: string, password: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, include: { resume: true } });
    if (!user || !await argon2.verify(user.passwordHash, password)) throw new UnauthorizedException('Senha inválida');
    await this.db.$transaction(async (tx) => {
      await tx.auditLog.create({ data: { actorId: userId, targetId: userId, action: 'CANDIDATE_DELETED' } });
      await tx.user.delete({ where: { id: userId } });
    });
    if (user.resume) {
      try { await this.storage.remove(user.resume.storageKey); }
      catch { new Logger('PrivateStorage').error('Private file cleanup failed; storage maintenance required'); }
    }
  }
  async own(userId: string) {
    const profile = await this.db.candidateProfile.findUnique({ where: { userId }, include });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return profile;
  }
  async update(userId: string, dto: ProfileDto) {
    for (const period of [...dto.experiences, ...dto.education]) {
      if (period.endsAt && new Date(period.endsAt) < new Date(period.startsAt)) {
        throw new BadRequestException('A data final não pode ser anterior à inicial');
      }
    }
    await this.db.$transaction(async (tx) => {
      const existing = await tx.candidateProfile.findUnique({ where: { userId } });
      if (!existing) throw new NotFoundException('Perfil não encontrado');
      const profile = await tx.candidateProfile.update({ where: { userId }, data: {
        name: dto.name, phone: dto.phone ?? null, location: dto.location ?? null,
        linkedIn: dto.linkedIn ?? null, portfolio: dto.portfolio ?? null,
        seniority: dto.seniority ?? null, salaryCents: dto.salaryCents ?? null, summary: dto.summary ?? null,
        talentConsentAt: dto.talentConsent ? existing.talentConsentAt ?? new Date() : null,
      } });
      await tx.candidateSkill.deleteMany({ where: { candidateId: profile.id } });
      for (const name of normalizedSkills(dto.skills)) {
        const skill = await tx.skill.upsert({ where: { name }, update: {}, create: { name } });
        await tx.candidateSkill.create({ data: { candidateId: profile.id, skillId: skill.id } });
      }
      await tx.experience.deleteMany({ where: { candidateId: profile.id } });
      await tx.education.deleteMany({ where: { candidateId: profile.id } });
      for (const item of dto.experiences) await tx.experience.create({ data: {
        candidateId: profile.id, company: item.company.trim(), title: item.title.trim(),
        startsAt: new Date(item.startsAt), endsAt: item.endsAt ? new Date(item.endsAt) : null, description: item.description,
      } });
      for (const item of dto.education) await tx.education.create({ data: {
        candidateId: profile.id, institution: item.institution.trim(), course: item.course.trim(),
        startsAt: new Date(item.startsAt), endsAt: item.endsAt ? new Date(item.endsAt) : null,
      } });
      await tx.auditLog.create({ data: { actorId: userId, targetId: profile.id, action: 'PROFILE_UPDATED' } });
    });
    return this.own(userId);
  }
  async list(query: PaginationDto) {
    const where = { ...(query.search ? { name: { contains: query.search.trim() } } : {}), user: { active: true } };
    const [items, total] = await this.db.$transaction([
      this.db.candidateProfile.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, location: true, seniority: true, skills: { include: { skill: true } } } }),
      this.db.candidateProfile.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
  async detail(id: string, actorId: string) {
    const profile = await this.db.candidateProfile.findUnique({ where: { id }, include });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    await this.db.auditLog.create({ data: { actorId, action: 'CANDIDATE_VIEWED', targetId: id } });
    return profile;
  }
}
