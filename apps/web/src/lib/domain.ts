export const seniorities = { INTERN: 'Estágio', JUNIOR: 'Júnior', MID: 'Pleno', SENIOR: 'Sênior', LEAD: 'Liderança' } as const;
export const workModes = { REMOTE: 'Remoto', HYBRID: 'Híbrido', ONSITE: 'Presencial' } as const;
export const jobStatuses = { DRAFT: 'Rascunho', PUBLISHED: 'Publicada', CLOSED: 'Encerrada', CANCELLED: 'Cancelada' } as const;
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export interface SkillLink { skill: { id: string; name: string } }
export interface CandidateSummary { id: string; name: string; location: string | null; seniority: keyof typeof seniorities | null; skills: SkillLink[] }
export interface ProfessionalProfile extends CandidateSummary {
  phone: string | null; linkedIn: string | null; portfolio: string | null; salaryCents: number | null;
  summary: string | null; talentConsentAt: string | null; updatedAt: string;
  experiences: { id: string; company: string; title: string; startsAt: string; endsAt: string | null; description: string | null }[];
  education: { id: string; institution: string; course: string; startsAt: string; endsAt: string | null }[];
  user: { email: string; resume: { id: string; mimeType: string; size: number; createdAt: string } | null };
}
export interface Job {
  id: string; title: string; description: string; department: { id: string; name: string };
  seniority: keyof typeof seniorities; workMode: keyof typeof workModes; salaryMinCents: number | null; salaryMaxCents: number | null;
  opensAt: string; closesAt: string; status: keyof typeof jobStatuses; revision?: number; criteriaVersion?: number;
  technologyWeight?: number; seniorityWeight?: number; salaryWeight?: number;
  requirements: { id: string; text: string; kind: 'ESSENTIAL' | 'DESIRABLE'; skill: { id: string; name: string } | null }[];
}
export const money = (cents: number | null) => cents == null ? 'A combinar' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const dateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
export const splitValues = (value: string) => [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
export const cents = (value: string) => value.trim() ? Math.round(Number(value.replace(',', '.')) * 100) : null;
export const salaryInput = (value: number | null) => value == null ? '' : (value / 100).toFixed(2);
export const moneyPattern = /^\d{1,7}([.,]\d{1,2})?$/;
