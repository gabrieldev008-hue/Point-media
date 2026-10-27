import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { normalizedSkills } from '../common/skills';
import { JobDto, JobQueryDto, JobStatusDto, UpdateJobDto } from './jobs.dto';
const include = { department: true, requirements: { include: { skill: true } } };
type JobRecord = Prisma.JobOpeningGetPayload<{ include: typeof include }>;
export function effectiveStatus(job: { status: JobStatus; closesAt: Date }, now = new Date()): JobStatus {
  return job.status === 'PUBLISHED' && job.closesAt <= now ? 'CLOSED' : job.status;
}
function output(job: JobRecord, internal: boolean) {
  const base = { id: job.id, title: job.title, description: job.description, department: job.department,
    seniority: job.seniority, workMode: job.workMode, salaryMinCents: job.salaryMinCents, salaryMaxCents: job.salaryMaxCents,
    opensAt: job.opensAt, closesAt: job.closesAt, status: effectiveStatus(job), requirements: job.requirements };
  return internal ? { ...base, revision: job.revision, criteriaVersion: job.criteriaVersion,
    technologyWeight: job.technologyWeight, seniorityWeight: job.seniorityWeight, salaryWeight: job.salaryWeight } : base;
}
@Injectable()
export class JobsService {
  constructor(private readonly db: PrismaService) {}
  async list(query: JobQueryDto, internal: boolean) {
    const now = new Date();
    let where: Prisma.JobOpeningWhereInput;
    if (!internal) where = { status: 'PUBLISHED', opensAt: { lte: now }, closesAt: { gt: now } };
    else if (query.status === 'CLOSED') where = { OR: [{ status: 'CLOSED' }, { status: 'PUBLISHED', closesAt: { lte: now } }] };
    else if (query.status === 'PUBLISHED') where = { status: 'PUBLISHED', closesAt: { gt: now } };
    else where = query.status ? { status: query.status } : {};
    if (query.search) where.title = { contains: query.search.trim() };
    const [rows, total] = await this.db.$transaction([
      this.db.jobOpening.findMany({ where, include, skip: (query.page - 1) * query.pageSize, take: query.pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }), this.db.jobOpening.count({ where }),
    ]);
    return { items: rows.map((job) => output(job, internal)), total, page: query.page, pageSize: query.pageSize };
  }
  async detail(id: string, internal: boolean) {
    const job = await this.db.jobOpening.findUnique({ where: { id }, include });
    if (!job || (!internal && (effectiveStatus(job) !== 'PUBLISHED' || job.opensAt > new Date()))) throw new NotFoundException('Vaga não encontrada ou indisponível');
    return output(job, internal);
  }
  private validate(dto: JobDto) {
    if (dto.technologyWeight + dto.seniorityWeight + dto.salaryWeight !== 100) throw new BadRequestException('Os pesos devem somar 100');
    if (new Date(dto.closesAt) <= new Date(dto.opensAt)) throw new BadRequestException('Encerramento deve ser posterior à abertura');
    if (dto.salaryMinCents != null && dto.salaryMaxCents != null && dto.salaryMaxCents < dto.salaryMinCents) throw new BadRequestException('Faixa salarial inválida');
    const essential = normalizedSkills(dto.requiredSkills);
    if (normalizedSkills(dto.desiredSkills).some((skill) => essential.includes(skill))) throw new BadRequestException('Uma tecnologia não pode ser obrigatória e diferencial ao mesmo tempo');
    if (!dto.department.trim()) throw new BadRequestException('Informe o departamento');
  }
  private async requirements(tx: Prisma.TransactionClient, jobId: string, dto: JobDto) {
    await tx.jobRequirement.deleteMany({ where: { jobId } });
    for (const [values, kind] of [[dto.requiredSkills, 'ESSENTIAL'], [dto.desiredSkills, 'DESIRABLE']] as const) {
      for (const name of normalizedSkills(values)) {
        const skill = await tx.skill.upsert({ where: { name }, update: {}, create: { name } });
        await tx.jobRequirement.create({ data: { jobId, skillId: skill.id, text: name, kind } });
      }
    }
    for (const [values, kind] of [[dto.essentials, 'ESSENTIAL'], [dto.desirables, 'DESIRABLE']] as const) {
      for (const text of [...new Set(values.map((value) => value.trim()).filter(Boolean))]) {
        await tx.jobRequirement.create({ data: { jobId, text, kind } });
      }
    }
  }
  private fields(dto: JobDto) {
    return { title: dto.title, description: dto.description.trim(), seniority: dto.seniority, workMode: dto.workMode,
      salaryMinCents: dto.salaryMinCents ?? null, salaryMaxCents: dto.salaryMaxCents ?? null,
      opensAt: new Date(dto.opensAt), closesAt: new Date(dto.closesAt), technologyWeight: dto.technologyWeight,
      seniorityWeight: dto.seniorityWeight, salaryWeight: dto.salaryWeight };
  }
  async create(dto: JobDto, actorId: string) {
    this.validate(dto);
    const id = await this.db.$transaction(async (tx) => {
      const department = await tx.department.upsert({ where: { name: dto.department.trim() }, update: {}, create: { name: dto.department.trim() } });
      const job = await tx.jobOpening.create({ data: { ...this.fields(dto), departmentId: department.id, createdById: actorId } });
      await this.requirements(tx, job.id, dto);
      await tx.auditLog.create({ data: { actorId, targetId: job.id, action: 'JOB_CREATED' } });
      return job.id;
    });
    return this.detail(id, true);
  }
  async update(id: string, dto: UpdateJobDto, actorId: string) {
    this.validate(dto);
    await this.db.$transaction(async (tx) => {
      const old = await tx.jobOpening.findUnique({ where: { id } });
      if (!old) throw new NotFoundException('Vaga não encontrada');
      if (['CLOSED', 'CANCELLED'].includes(effectiveStatus(old))) throw new BadRequestException('Vaga encerrada não pode ser editada');
      if (old.status === 'PUBLISHED' && new Date(dto.closesAt) <= new Date()) throw new BadRequestException('Use a ação de encerrar a vaga');
      const department = await tx.department.upsert({ where: { name: dto.department.trim() }, update: {}, create: { name: dto.department.trim() } });
      const result = await tx.jobOpening.updateMany({ where: { id, revision: dto.revision },
        data: { ...this.fields(dto), departmentId: department.id, revision: { increment: 1 }, criteriaVersion: { increment: 1 } } });
      if (!result.count) throw new ConflictException('A vaga foi alterada. Atualize a página');
      await this.requirements(tx, id, dto);
      await tx.auditLog.create({ data: { actorId, targetId: id, action: 'JOB_UPDATED' } });
    });
    return this.detail(id, true);
  }
  async status(id: string, dto: JobStatusDto, actorId: string) {
    await this.db.$transaction(async (tx) => {
      const job = await tx.jobOpening.findUnique({ where: { id } });
      if (!job) throw new NotFoundException('Vaga não encontrada');
      const transitions: Record<JobStatus, JobStatus[]> = { DRAFT: ['PUBLISHED', 'CANCELLED'], PUBLISHED: ['CLOSED', 'CANCELLED'], CLOSED: [], CANCELLED: [] };
      const current = effectiveStatus(job);
      // Explicit closure can persist a vacancy already closed by its deadline.
      if (!(job.status === 'PUBLISHED' && dto.status === 'CLOSED') && !transitions[current].includes(dto.status)) throw new BadRequestException('Transição de vaga não permitida');
      if (dto.status === 'PUBLISHED' && job.closesAt <= new Date()) throw new BadRequestException('Prazo da vaga já encerrou');
      const result = await tx.jobOpening.updateMany({ where: { id, revision: dto.revision }, data: { status: dto.status, revision: { increment: 1 } } });
      if (!result.count) throw new ConflictException('A vaga foi alterada. Atualize a página');
      await tx.auditLog.create({ data: { actorId, targetId: id, action: `JOB_${dto.status}` } });
    });
    return this.detail(id, true);
  }
  async remove(id: string, actorId: string) {
    await this.db.$transaction(async (tx) => {
      const job = await tx.jobOpening.findUnique({ where: { id } });
      if (!job) throw new NotFoundException('Vaga não encontrada');
      if (job.status !== 'DRAFT') throw new BadRequestException('Somente rascunhos podem ser excluídos. Encerre ou cancele vagas publicadas');
      await tx.jobOpening.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId, targetId: id, action: 'JOB_DELETED' } });
    });
  }
}
