import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { QueryError, Pagination } from '../../components/ui/Field';
import { money, seniorities, type CandidateSummary, type Page, type ProfessionalProfile } from '../../lib/domain';
export function RecruitmentCandidates() {
  const [page, setPage] = useState(1), [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['candidates', page, search], queryFn: () => api<Page<CandidateSummary>>(`/candidates?page=${page}&search=${encodeURIComponent(search)}`) });
  return <><h1>Candidatos</h1><div className="candidate-toolbar"><div><label className="sr-only" htmlFor="candidate-search">Buscar candidato por nome</label><input className="search-input" id="candidate-search" placeholder="Buscar por nome…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></div>{query.data && <div className="metric"><span>{search ? 'perfis encontrados' : 'candidatos ativos'}</span><strong>{query.data.total} {query.data.total === 1 ? 'perfil' : 'perfis'}</strong></div>}</div>
    {query.isPending && <p role="status">Carregando candidatos…</p>}{query.error && <QueryError message={query.error.message} retry={() => void query.refetch()}/>}
    {query.data && <>{!query.data.total && <p className="panel empty">Nenhum perfil encontrado.</p>}<div className="candidate-list">{query.data.items.map((candidate) => <article key={candidate.id} className="candidate-row"><div><h2>{candidate.name}</h2><p className="muted">{candidate.seniority ? seniorities[candidate.seniority] : 'Senioridade não informada'}</p></div><p className="muted">{candidate.location ?? 'Localização não informada'}</p><div className="tags">{candidate.skills.map(({ skill }) => <span className="tag blue" key={skill.id}>{skill.name}</span>)}</div><Link className="button secondary" to={`/rh/candidatos/${candidate.id}`}>Ver perfil</Link></article>)}</div><Pagination {...query.data} change={setPage}/></>}
  </>;
}
export function CandidateDetails() {
  const { id } = useParams(); const query = useQuery({ queryKey: ['candidate', id], queryFn: () => api<ProfessionalProfile>(`/candidates/${id}`) });
  if (query.isPending) return <p role="status">Carregando perfil…</p>;
  if (query.error) return <QueryError message={query.error.message} retry={() => void query.refetch()}/>;
  const profile = query.data;
  return <><Link to="/rh/candidatos">← Voltar aos candidatos</Link><h1>{profile.name}</h1><section className="panel"><h2>Informações profissionais</h2><dl className="details-grid"><div><dt>E-mail</dt><dd>{profile.user.email}</dd></div><div><dt>Telefone</dt><dd>{profile.phone ?? 'Não informado'}</dd></div><div><dt>Localização</dt><dd>{profile.location ?? 'Não informada'}</dd></div><div><dt>Senioridade</dt><dd>{profile.seniority ? seniorities[profile.seniority] : 'Não informada'}</dd></div><div><dt>Pretensão salarial</dt><dd>{money(profile.salaryCents)}</dd></div></dl><p className="pre-wrap">{profile.summary}</p><div className="tags">{profile.skills.map(({ skill }) => <span className="tag blue" key={skill.id}>{skill.name}</span>)}</div><div className="actions">{profile.linkedIn && <a href={profile.linkedIn} target="_blank" rel="noreferrer">LinkedIn ↗</a>}{profile.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer">Portfólio ↗</a>}{profile.user.resume && <a className="button" href={`/api/resumes/${profile.user.resume.id}`}>Baixar currículo</a>}</div></section>
    <section className="panel"><h2>Experiência profissional</h2>{!profile.experiences.length && <p className="muted">Não informada.</p>}{profile.experiences.map((item) => <article className="entry" key={item.id}><h3>{item.title} · {item.company}</h3><p className="muted">{item.startsAt.slice(0, 10)} a {item.endsAt?.slice(0, 10) ?? 'atual'}</p><p className="pre-wrap">{item.description}</p></article>)}<h2>Formação acadêmica</h2>{!profile.education.length && <p className="muted">Não informada.</p>}{profile.education.map((item) => <article className="entry" key={item.id}><h3>{item.course}</h3><p>{item.institution}</p><p className="muted">{item.startsAt.slice(0, 10)} a {item.endsAt?.slice(0, 10) ?? 'em curso'}</p></article>)}</section>
  </>;
}
