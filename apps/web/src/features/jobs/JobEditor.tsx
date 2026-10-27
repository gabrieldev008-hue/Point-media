import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Field } from '../../components/ui/Field';
import { cents, moneyPattern, salaryInput, seniorities, splitValues, workModes, type Job } from '../../lib/domain';
const money = z.string().refine((value) => !value || moneyPattern.test(value), 'Informe um valor válido em reais');
const schema = z.object({
  title: z.string().trim().min(3, 'Informe o título').max(150), description: z.string().trim().min(20, 'Descreva a vaga com pelo menos 20 caracteres').max(15000),
  department: z.string().trim().min(2, 'Informe o departamento').max(100), seniority: z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD']), workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']),
  salaryMin: money, salaryMax: money, opensAt: z.string().min(16, 'Informe data e hora'), closesAt: z.string().min(16, 'Informe data e hora'),
  requiredSkills: z.string(), desiredSkills: z.string(), essentials: z.string(), desirables: z.string(),
  technologyWeight: z.number().int().min(0).max(100), seniorityWeight: z.number().int().min(0).max(100), salaryWeight: z.number().int().min(0).max(100),
}).refine((value) => value.technologyWeight + value.seniorityWeight + value.salaryWeight === 100, { message: 'Os pesos devem somar 100%', path: ['technologyWeight'] })
  .refine((value) => value.closesAt > value.opensAt, { message: 'Encerramento deve ser posterior à abertura', path: ['closesAt'] })
  .refine((value) => !value.salaryMin || !value.salaryMax || cents(value.salaryMax)! >= cents(value.salaryMin)!, { message: 'Salário máximo menor que o mínimo', path: ['salaryMax'] });
type Values = z.infer<typeof schema>;
const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function localInput(value: string) { return formatter.format(new Date(value)).replace(' ', 'T').slice(0, 16); }
function zonedInstant(value: string) {
  const target = new Date(`${value}:00Z`).getTime();
  let instant = target;
  for (let index = 0; index < 3; index++) {
    const formatted = formatter.format(new Date(instant)).replace(' ', 'T');
    instant += target - new Date(`${formatted}Z`).getTime();
  }
  return new Date(instant).toISOString();
}
export function JobEditor({ job }: { job?: Job }) {
  const navigate = useNavigate(), client = useQueryClient();
  const required = (kind: 'ESSENTIAL' | 'DESIRABLE', skill: boolean) => job?.requirements.filter((item) => item.kind === kind && !!item.skill === skill).map((item) => item.text).join(skill ? ', ' : '\n') ?? '';
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    title: job?.title ?? '', description: job?.description ?? '', department: job?.department.name ?? '', seniority: job?.seniority ?? 'JUNIOR', workMode: job?.workMode ?? 'REMOTE',
    salaryMin: salaryInput(job?.salaryMinCents ?? null), salaryMax: salaryInput(job?.salaryMaxCents ?? null),
    opensAt: localInput(job?.opensAt ?? new Date().toISOString()), closesAt: localInput(job?.closesAt ?? new Date(Date.now() + 30 * 86400000).toISOString()),
    requiredSkills: required('ESSENTIAL', true), desiredSkills: required('DESIRABLE', true), essentials: required('ESSENTIAL', false), desirables: required('DESIRABLE', false),
    technologyWeight: job?.technologyWeight ?? 50, seniorityWeight: job?.seniorityWeight ?? 30, salaryWeight: job?.salaryWeight ?? 20,
  } });
  const save = useMutation({ mutationFn: (values: Values) => api<Job>(`/recruitment/jobs${job ? `/${job.id}` : ''}`, { method: job ? 'PUT' : 'POST', body: JSON.stringify({
    title: values.title, description: values.description, department: values.department, seniority: values.seniority, workMode: values.workMode,
    salaryMinCents: cents(values.salaryMin), salaryMaxCents: cents(values.salaryMax), opensAt: zonedInstant(values.opensAt), closesAt: zonedInstant(values.closesAt),
    requiredSkills: splitValues(values.requiredSkills), desiredSkills: splitValues(values.desiredSkills),
    essentials: values.essentials.split('\n').map((item) => item.trim()).filter(Boolean), desirables: values.desirables.split('\n').map((item) => item.trim()).filter(Boolean),
    technologyWeight: values.technologyWeight, seniorityWeight: values.seniorityWeight, salaryWeight: values.salaryWeight,
    ...(job ? { revision: job.revision } : {}),
  }) }), onSuccess: (result) => { void client.invalidateQueries({ queryKey: ['jobs'] }); void client.invalidateQueries({ queryKey: ['job', result.id] }); navigate('/rh/vagas'); } });
  return <section className="panel"><h2>{job ? `Editar: ${job.title}` : 'Nova vaga'}</h2><form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
    <Field id="job-title" label="Título" error={errors.title?.message}><input id="job-title" {...register('title')}/></Field>
    <Field id="job-description" label="Descrição da oportunidade" error={errors.description?.message}><textarea id="job-description" rows={5} {...register('description')}/></Field>
    <div className="form-grid"><Field id="job-department" label="Departamento" error={errors.department?.message}><input id="job-department" {...register('department')}/></Field><Field id="job-seniority" label="Senioridade"><select id="job-seniority" {...register('seniority')}>{Object.entries(seniorities).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
    <Field id="job-mode" label="Modalidade"><select id="job-mode" {...register('workMode')}>{Object.entries(workModes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field><div/>
    <Field id="job-min" label="Faixa salarial mínima (R$)" error={errors.salaryMin?.message}><input id="job-min" inputMode="decimal" {...register('salaryMin')}/></Field><Field id="job-max" label="Faixa salarial máxima (R$)" error={errors.salaryMax?.message}><input id="job-max" inputMode="decimal" {...register('salaryMax')}/></Field>
    <Field id="job-opens" label="Abertura (horário de Brasília)" error={errors.opensAt?.message}><input id="job-opens" type="datetime-local" {...register('opensAt')}/></Field><Field id="job-closes" label="Encerramento (horário de Brasília)" error={errors.closesAt?.message}><input id="job-closes" type="datetime-local" {...register('closesAt')}/></Field></div>
    <Field id="job-skills" label="Tecnologias obrigatórias"><input id="job-skills" {...register('requiredSkills')} placeholder="React, TypeScript, Figma"/></Field>
    <Field id="job-desired" label="Tecnologias diferenciais"><input id="job-desired" {...register('desiredSkills')} placeholder="Separe por vírgulas"/></Field>
    <div className="form-grid"><Field id="job-essentials" label="Outros requisitos indispensáveis"><textarea id="job-essentials" {...register('essentials')} placeholder="Um requisito por linha"/></Field><Field id="job-desirables" label="Outros diferenciais"><textarea id="job-desirables" {...register('desirables')} placeholder="Um requisito por linha"/></Field></div>
    <fieldset><legend>Pesos dos critérios de compatibilidade</legend><p className="muted">Configure os pesos desta vaga. A soma deve ser 100%.</p><div className="weights-grid">{(['technologyWeight', 'seniorityWeight', 'salaryWeight'] as const).map((name, index) => <Field key={name} id={`job-${name}`} label={['Tecnologias (%)', 'Senioridade (%)', 'Salário (%)'][index]} error={errors[name]?.message}><input type="number" min="0" max="100" id={`job-${name}`} {...register(name, { valueAsNumber: true })}/></Field>)}</div></fieldset>
    {Object.keys(errors).length > 0 && <p className="error" role="alert">Revise os campos indicados.</p>}{save.error && <p className="error" role="alert">{save.error.message}</p>}
    <div className="actions"><button disabled={save.isPending}>{save.isPending ? 'Salvando…' : job ? 'Salvar alterações' : 'Salvar rascunho'}</button><button type="button" className="secondary" onClick={() => navigate('/rh/vagas')}>Voltar</button></div>
  </form></section>;
}
