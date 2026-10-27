import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { QueryError, Pagination } from '../../components/ui/Field';
import { dateTime, jobStatuses, money, seniorities, workModes, type Job, type Page } from '../../lib/domain';
import { useSession } from '../auth/session';
import { JobEditor } from './JobEditor';
export function PublicJobs({ embedded = false }: { embedded?: boolean }) {
  const Heading = embedded ? 'h2' : 'h1';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['jobs', 'public', page, search], queryFn: () => api<Page<Job>>(`/jobs?page=${page}&search=${encodeURIComponent(search)}`) });
  return <section id="vagas" className={embedded ? 'home-jobs' : ''}><Heading>Vagas disponíveis</Heading><p className="muted">Explore oportunidades abertas e encontre a vaga que combina com seu perfil profissional.</p>
    {!embedded && <><label className="sr-only" htmlFor="public-job-search">Buscar vagas por título</label><input className="search-input" id="public-job-search" type="search" placeholder="Buscar oportunidade…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></>}
    {query.isPending && <p role="status">Carregando oportunidades…</p>}{query.error && <QueryError message={query.error.message} retry={() => void query.refetch()}/>}
    {query.data && <>{!query.data.total && <div className="panel empty"><h2>Nenhuma vaga aberta no momento</h2><p>Você pode manter seu perfil atualizado para novas oportunidades.</p><Link className="button" to="/cadastro">Criar conta</Link></div>}
      <div className="job-list">{query.data.items.map((job) => <article className="vacancy" key={job.id}><div><div className="tags"><span className="tag green">Inscrições abertas</span><span className="tag">{seniorities[job.seniority]}</span></div><h2>{job.title}</h2><p className="muted">{job.department.name} · {workModes[job.workMode]}</p></div><div><Link className="button secondary" to={`/vagas/${job.id}`}>Ver oportunidade</Link><p className="muted small">Inscrições até {dateTime(job.closesAt)}</p></div></article>)}</div>
      {query.data.total > query.data.pageSize && <Pagination {...query.data} change={setPage}/>}</>}
  </section>;
}
export function JobDetails() {
  const { id } = useParams(); const session = useSession();
  const query = useQuery({ queryKey: ['job', id, 'public'], queryFn: () => api<Job>(`/jobs/${id}`) });
  if (query.isPending) return <p role="status">Carregando oportunidade…</p>;
  if (query.error) return <QueryError message={query.error.message} retry={() => void query.refetch()}/>;
  const job = query.data;
  if (session.data && session.data.role !== 'CANDIDATE') return <><h1>Informações da vaga</h1><JobDescription job={job}/><Link className="button" to={`/rh/vagas/${job.id}`}>Gerenciar esta vaga</Link></>;
  return <><div className="page-heading"><Link to="/vagas">← Voltar às vagas</Link><h1>Informações da vaga</h1></div><JobDescription job={job}/><section className="panel"><h2>Seu perfil profissional</h2><p>Mantenha suas informações e seu currículo atualizados.</p><Link className="button" to={session.data ? '/perfil' : '/cadastro'}>{session.data ? 'Atualizar meu perfil' : 'Criar meu perfil'}</Link><p className="muted small">A candidatura a esta vaga será disponibilizada na próxima etapa do sistema. Criar um perfil não registra uma inscrição.</p></section></>;
}
export function JobDescription({ job }: { job: Job }) {
  return <article className="panel job-description"><h2 className="pink">{job.title}</h2><div className="tags"><span className="tag">{seniorities[job.seniority]}</span><span className="tag blue">{workModes[job.workMode]}</span><span>{job.department.name}</span></div><p className="pre-wrap">{job.description}</p><p><strong>Faixa salarial:</strong> {money(job.salaryMinCents)}{job.salaryMaxCents != null ? ` a ${money(job.salaryMaxCents)}` : ''}</p>
    {(['ESSENTIAL', 'DESIRABLE'] as const).map((kind) => <section key={kind}><h3>{kind === 'ESSENTIAL' ? 'Requisitos indispensáveis' : 'Diferenciais'}</h3><ul>{job.requirements.filter((requirement) => requirement.kind === kind).map((requirement) => <li key={requirement.id}>{requirement.text}</li>)}</ul>{!job.requirements.some((requirement) => requirement.kind === kind) && <p className="muted">Não informados.</p>}</section>)}
    <p className="muted">Prazo: {dateTime(job.opensAt)} a {dateTime(job.closesAt)} · Brasília</p></article>;
}
export function RecruitmentJobs() {
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [status, setStatus] = useState('');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['jobs', 'internal', page, search, status], queryFn: () => api<Page<Job>>(`/recruitment/jobs?page=${page}&search=${encodeURIComponent(search)}${status ? `&status=${status}` : ''}`) });
  const action = useMutation({ mutationFn: ({ job, status }: { job: Job; status: string }) => status === 'DELETE' ? api(`/recruitment/jobs/${job.id}`, { method: 'DELETE' }) : api(`/recruitment/jobs/${job.id}/status`, { method: 'PATCH', body: JSON.stringify({ status, revision: job.revision }) }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['jobs'] }); } });
  function change(job: Job, status: string) { if (window.confirm(`${status === 'PUBLISHED' ? 'Publicar' : status === 'CLOSED' ? 'Encerrar' : status === 'DELETE' ? 'Excluir' : 'Cancelar'} a vaga “${job.title}”?`)) action.mutate({ job, status }); }
  return <><div className="page-heading"><h1>Gestão de vagas</h1><Link className="button" to="/rh/vagas/nova">Criar vaga</Link></div><div className="filters"><label className="sr-only" htmlFor="rh-job-search">Buscar vaga</label><input id="rh-job-search" type="search" placeholder="Buscar por título…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/><label className="sr-only" htmlFor="job-status">Status</label><select id="job-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos os status</option>{Object.entries(jobStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {query.isPending && <p role="status">Carregando vagas…</p>}{query.error && <QueryError message={query.error.message} retry={() => void query.refetch()}/>}{action.error && <p className="error" role="alert">{action.error.message}</p>}
    {query.data && <>{!query.data.total && <div className="panel empty"><h2>Nenhuma vaga encontrada</h2><p>Crie um rascunho para começar.</p></div>}<div className="management-grid">{query.data.items.map((job) => <article className="panel job-card" key={job.id}><div className="tags"><span className={`tag ${job.status === 'PUBLISHED' ? 'blue' : ''}`}>{jobStatuses[job.status]}</span><span>{job.department.name}</span></div><h2>{job.title}</h2><p className="muted">{seniorities[job.seniority]} · {workModes[job.workMode]}</p><h3>Skills obrigatórias</h3><div className="tags">{job.requirements.filter((item) => item.skill && item.kind === 'ESSENTIAL').map((item) => <span className="tag" key={item.id}>{item.text}</span>)}</div><h3>Skills desejáveis</h3><div className="tags">{job.requirements.filter((item) => item.skill && item.kind === 'DESIRABLE').map((item) => <span className="tag blue" key={item.id}>{item.text}</span>)}</div><p className="muted small">Encerramento: {dateTime(job.closesAt)}</p><div className="actions">
      {['DRAFT', 'PUBLISHED'].includes(job.status) && <Link className="button secondary" to={`/rh/vagas/${job.id}`}>Editar vaga</Link>}
      {job.status === 'DRAFT' && <><button disabled={action.isPending} onClick={() => change(job, 'PUBLISHED')}>Publicar vaga</button><button disabled={action.isPending} className="secondary" onClick={() => change(job, 'DELETE')}>Excluir rascunho</button></>}
      {job.status === 'PUBLISHED' && <button disabled={action.isPending} onClick={() => change(job, 'CLOSED')}>Encerrar vaga</button>}
      {['DRAFT', 'PUBLISHED'].includes(job.status) && <button disabled={action.isPending} className="secondary" onClick={() => change(job, 'CANCELLED')}>Cancelar vaga</button>}
    </div></article>)}</div><Pagination {...query.data} change={setPage}/></>}
  </>;
}
export function EditJobPage() {
  const { id } = useParams(); const query = useQuery({ queryKey: ['job', id, 'internal'], queryFn: () => api<Job>(`/recruitment/jobs/${id}`) });
  if (query.isPending) return <p role="status">Carregando vaga…</p>;
  if (query.error) return <QueryError message={query.error.message} retry={() => void query.refetch()}/>;
  return <><h1>Gestão de vagas</h1>{['CLOSED', 'CANCELLED'].includes(query.data.status) ? <JobDescription job={query.data}/> : <JobEditor key={`${id}-${query.data.revision}`} job={query.data}/>}</>;
}
