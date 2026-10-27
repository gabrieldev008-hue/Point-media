import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Field, QueryError } from '../../components/ui/Field';
import { cents, moneyPattern, salaryInput, seniorities, splitValues, type ProfessionalProfile } from '../../lib/domain';
import { sessionKey } from '../auth/session';
const url = z.string().refine((value) => !value || (URL.canParse(value) && new URL(value).protocol === 'https:'), 'Use um endereço https:// válido');
const period = z.object({ startsAt: z.string().min(10, 'Informe a data inicial'), endsAt: z.string() }).refine((value) => !value.endsAt || value.endsAt >= value.startsAt, { message: 'Data final anterior à inicial', path: ['endsAt'] });
const schema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(120), phone: z.string().refine((value) => !value || /^[+()\d\s.-]{8,30}$/.test(value), 'Telefone inválido'),
  location: z.string().max(120), linkedIn: url, portfolio: url,
  seniority: z.enum(['', 'INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD']), salary: z.string().refine((value) => !value || moneyPattern.test(value), 'Informe um valor válido em reais'),
  skills: z.string().max(3000), summary: z.string().max(5000), talentConsent: z.boolean(),
  experiences: z.array(period.safeExtend({ company: z.string().trim().min(1, 'Informe a empresa').max(120), title: z.string().trim().min(1, 'Informe o cargo').max(120), description: z.string().max(2000) })).max(30),
  education: z.array(period.safeExtend({ institution: z.string().trim().min(1, 'Informe a instituição').max(120), course: z.string().trim().min(1, 'Informe o curso').max(160) })).max(20),
});
type Values = z.infer<typeof schema>;
function defaults(profile: ProfessionalProfile): Values {
  return { name: profile.name, phone: profile.phone ?? '', location: profile.location ?? '', linkedIn: profile.linkedIn ?? '', portfolio: profile.portfolio ?? '',
    seniority: profile.seniority ?? '', salary: salaryInput(profile.salaryCents), skills: profile.skills.map(({ skill }) => skill.name).join(', '), summary: profile.summary ?? '', talentConsent: !!profile.talentConsentAt,
    experiences: profile.experiences.map((item) => ({ company: item.company, title: item.title, startsAt: item.startsAt.slice(0, 10), endsAt: item.endsAt?.slice(0, 10) ?? '', description: item.description ?? '' })),
    education: profile.education.map((item) => ({ institution: item.institution, course: item.course, startsAt: item.startsAt.slice(0, 10), endsAt: item.endsAt?.slice(0, 10) ?? '' })) };
}
export function ProfilePage() {
  const query = useQuery({ queryKey: ['profile'], queryFn: () => api<ProfessionalProfile>('/candidates/me') });
  if (query.isPending) return <p role="status">Carregando perfil…</p>;
  if (query.error) return <QueryError message={query.error.message} retry={() => void query.refetch()}/>;
  return <><h1>Meu perfil profissional</h1><p className="muted">Mantenha suas informações atualizadas para as oportunidades da Point Media.</p><ProfileEditor profile={query.data}/></>;
}
function ProfileEditor({ profile }: { profile: ProfessionalProfile }) {
  const client = useQueryClient();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(profile) });
  const experiences = useFieldArray({ control, name: 'experiences' });
  const education = useFieldArray({ control, name: 'education' });
  useEffect(() => reset(defaults(profile)), [profile, reset]);
  const save = useMutation({ mutationFn: (values: Values) => api<ProfessionalProfile>('/candidates/me', { method: 'PUT', body: JSON.stringify({
    name: values.name, phone: values.phone || null, location: values.location || null, linkedIn: values.linkedIn || null, portfolio: values.portfolio || null,
    seniority: values.seniority || null, salaryCents: cents(values.salary), summary: values.summary || null,
    talentConsent: values.talentConsent, skills: splitValues(values.skills),
    experiences: values.experiences.map((item) => ({ ...item, endsAt: item.endsAt || null })), education: values.education.map((item) => ({ ...item, endsAt: item.endsAt || null })),
  }) }), onSuccess: (updated) => { client.setQueryData(['profile'], updated); void client.invalidateQueries({ queryKey: sessionKey }); } });
  return <><section className="panel profile-panel"><form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
    <div className="avatar-row"><div className="avatar" aria-hidden="true">{profile.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><h2>{profile.name}</h2><p className="muted">Conta do candidato</p></div></div>
    <div className="form-grid">
      <Field id="profile-name" label="Nome completo" error={errors.name?.message}><input id="profile-name" {...register('name')} aria-invalid={!!errors.name} aria-describedby="profile-name-error" autoComplete="name"/></Field>
      <Field id="profile-email" label="E-mail"><input id="profile-email" value={profile.user.email} readOnly/></Field>
      <Field id="profile-phone" label="Telefone" error={errors.phone?.message}><input id="profile-phone" {...register('phone')} autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby="profile-phone-error"/></Field>
      <Field id="profile-location" label="Localização" error={errors.location?.message}><input id="profile-location" {...register('location')} autoComplete="address-level2"/></Field>
      <Field id="profile-seniority" label="Senioridade"><select id="profile-seniority" {...register('seniority')}><option value="">Não informada</option>{Object.entries(seniorities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field id="profile-salary" label="Pretensão salarial (R$)" error={errors.salary?.message}><input id="profile-salary" {...register('salary')} inputMode="decimal" placeholder="Ex.: 3000,00" aria-invalid={!!errors.salary} aria-describedby="profile-salary-error"/></Field>
      <Field id="profile-linkedin" label="LinkedIn" error={errors.linkedIn?.message}><input id="profile-linkedin" {...register('linkedIn')} type="url" placeholder="https://linkedin.com/in/…"/></Field>
      <Field id="profile-portfolio" label="Portfólio" error={errors.portfolio?.message}><input id="profile-portfolio" {...register('portfolio')} type="url" placeholder="https://…"/></Field>
    </div>
    <Field id="profile-skills" label="Tecnologias e ferramentas que domina" error={errors.skills?.message}><input id="profile-skills" {...register('skills')} placeholder="Separe por vírgulas: Figma, React, Photoshop"/></Field>
    <Field id="profile-summary" label="Conte sobre você" error={errors.summary?.message}><textarea id="profile-summary" rows={4} {...register('summary')}/></Field>
    <fieldset><legend>Experiências profissionais</legend>{experiences.fields.map((field, index) => <div className="entry" key={field.id}>
      <div className="form-grid"><Field id={`company-${index}`} label="Empresa" error={errors.experiences?.[index]?.company?.message}><input id={`company-${index}`} {...register(`experiences.${index}.company`)}/></Field><Field id={`title-${index}`} label="Cargo" error={errors.experiences?.[index]?.title?.message}><input id={`title-${index}`} {...register(`experiences.${index}.title`)}/></Field>
      <Field id={`exp-start-${index}`} label="Início" error={errors.experiences?.[index]?.startsAt?.message}><input type="date" id={`exp-start-${index}`} {...register(`experiences.${index}.startsAt`)}/></Field><Field id={`exp-end-${index}`} label="Fim (vazio se atual)" error={errors.experiences?.[index]?.endsAt?.message}><input type="date" id={`exp-end-${index}`} {...register(`experiences.${index}.endsAt`)}/></Field></div>
      <Field id={`exp-description-${index}`} label="Atividades"><textarea id={`exp-description-${index}`} {...register(`experiences.${index}.description`)}/></Field><button className="secondary" type="button" onClick={() => experiences.remove(index)}>Remover experiência {index + 1}</button>
    </div>)}<button className="secondary" type="button" disabled={experiences.fields.length >= 30} onClick={() => experiences.append({ company: '', title: '', startsAt: '', endsAt: '', description: '' })}>Adicionar experiência</button></fieldset>
    <fieldset><legend>Formação acadêmica</legend>{education.fields.map((field, index) => <div className="entry" key={field.id}><div className="form-grid">
      <Field id={`institution-${index}`} label="Instituição" error={errors.education?.[index]?.institution?.message}><input id={`institution-${index}`} {...register(`education.${index}.institution`)}/></Field><Field id={`course-${index}`} label="Curso" error={errors.education?.[index]?.course?.message}><input id={`course-${index}`} {...register(`education.${index}.course`)}/></Field>
      <Field id={`edu-start-${index}`} label="Início" error={errors.education?.[index]?.startsAt?.message}><input type="date" id={`edu-start-${index}`} {...register(`education.${index}.startsAt`)}/></Field><Field id={`edu-end-${index}`} label="Conclusão (vazio se em curso)" error={errors.education?.[index]?.endsAt?.message}><input type="date" id={`edu-end-${index}`} {...register(`education.${index}.endsAt`)}/></Field></div><button className="secondary" type="button" onClick={() => education.remove(index)}>Remover formação {index + 1}</button></div>)}
      <button className="secondary" type="button" disabled={education.fields.length >= 20} onClick={() => education.append({ institution: '', course: '', startsAt: '', endsAt: '' })}>Adicionar formação</button></fieldset>
    <label className="checkbox"><input type="checkbox" {...register('talentConsent')}/>Autorizo manter meu perfil no banco de talentos para futuras oportunidades.</label>
    {Object.keys(errors).length > 0 && <p role="alert" className="error">Revise os campos indicados antes de salvar.</p>}
    {save.error && <p role="alert" className="error">{save.error.message}</p>}{save.isSuccess && <p role="status" className="success">Perfil salvo com sucesso.</p>}
    <button disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar alterações'}</button>
  </form></section><ResumePanel resume={profile.user.resume}/><DeleteAccount/></>;
}
function ResumePanel({ resume }: { resume: ProfessionalProfile['user']['resume'] }) {
  const client = useQueryClient(); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState('');
  const invalidate = () => { void client.invalidateQueries({ queryKey: ['profile'] }); };
  const upload = useMutation({ mutationFn: () => { const data = new FormData(); data.append('file', file!); return api('/candidates/me/resume', { method: 'POST', body: data }); }, onSuccess: () => { setFile(null); invalidate(); } });
  const remove = useMutation({ mutationFn: () => api('/candidates/me/resume', { method: 'DELETE' }), onSuccess: invalidate });
  return <section className="panel"><h2>Currículo</h2><p className="muted">PDF ou DOCX, até 5 MB. O acesso é restrito a você e à equipe autorizada de recrutamento.</p>
    {resume ? <div className="actions"><a className="button secondary" href={`/api/resumes/${resume.id}`}>Baixar currículo</a><button className="secondary" disabled={remove.isPending} onClick={() => { if (window.confirm('Excluir o currículo atual?')) remove.mutate(); }}>Excluir currículo</button><span>{Math.ceil(resume.size / 1024)} KB</span></div> : <p>Nenhum currículo enviado.</p>}
    <form onSubmit={(event) => { event.preventDefault(); if (!file) { setError('Selecione um arquivo'); return; } if (file.size > 5 * 1024 * 1024 || !/\.(pdf|docx)$/i.test(file.name)) { setError('Selecione PDF ou DOCX de até 5 MB'); return; } setError(''); upload.mutate(); }}>
      <Field id="resume-file" label={resume ? 'Atualizar currículo' : 'Anexar currículo'}><input id="resume-file" type="file" accept=".pdf,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)}/></Field>
      <button disabled={upload.isPending || remove.isPending}>{upload.isPending ? 'Enviando…' : 'Enviar currículo'}</button>
    </form>{(error || upload.error || remove.error) && <p className="error" role="alert">{error || upload.error?.message || remove.error?.message}</p>}{upload.isSuccess && <p className="success" role="status">Currículo enviado.</p>}
  </section>;
}
function DeleteAccount() {
  const [password, setPassword] = useState(''); const client = useQueryClient(); const navigate = useNavigate();
  const remove = useMutation({ mutationFn: () => api('/candidates/me', { method: 'DELETE', body: JSON.stringify({ password }) }), onSuccess: () => { client.clear(); client.setQueryData(sessionKey, null); navigate('/'); } });
  return <details className="panel danger-zone"><summary>Excluir minha conta e meus dados profissionais</summary><p>A exclusão remove perfil, currículo e sessões. Registros de auditoria sem nome e e-mail podem ser mantidos.</p><form onSubmit={(event) => { event.preventDefault(); if (window.confirm('Esta ação exclui sua conta permanentemente. Confirmar?')) remove.mutate(); }}><Field id="delete-password" label="Confirme sua senha atual"><input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}/></Field><button className="danger" disabled={remove.isPending}>Excluir minha conta</button>{remove.error && <p role="alert" className="error">{remove.error.message}</p>}</form></details>;
}
