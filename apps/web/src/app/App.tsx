import { type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@pointmedia/shared';
import { AuthForm } from '../features/auth/AuthForm';
import { useSession, sessionKey } from '../features/auth/session';
import { RecruiterForm } from '../features/admin/RecruiterForm';
import { api } from '../services/api';
import { ProfilePage } from '../features/candidates/ProfilePage';
import { CandidateDetails, RecruitmentCandidates } from '../features/candidates/RecruitmentCandidates';
import { EditJobPage, JobDetails, PublicJobs, RecruitmentJobs } from '../features/jobs/JobsPages';
import { JobEditor } from '../features/jobs/JobEditor';
import { Home } from '../features/home/Home';
import { PointMark } from '../components/ui/Brand';
import { Field } from '../components/ui/Field';

function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const session = useSession();
  if (session.isPending) return <p role="status">Carregando sessão…</p>;
  if (session.isError) return <p role="alert">Não foi possível verificar sua sessão. <button onClick={() => void session.refetch()}>Tentar novamente</button></p>;
  if (!session.data) return <Navigate to="/entrar" replace/>;
  if (!roles.includes(session.data.role)) return <p role="alert">Você não tem permissão para esta área.</p>;
  return children;
}
function Layout() {
  const session = useSession();
  const client = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const workspace = !!session.data && ['/conta', '/perfil', '/rh', '/admin'].some((prefix) => pathname.startsWith(prefix));
  const authPage = pathname === '/entrar' || pathname === '/cadastro';
  const logout = useMutation({ mutationFn: () => api<void>('/auth/logout', { method: 'POST' }), onSuccess: () => {
    client.clear(); client.setQueryData(sessionKey, null); navigate('/entrar');
  } });
  return <div className={`${workspace ? 'workspace' : 'public-layout'}${authPage ? ' auth-layout' : ''}${pathname === '/' ? ' home-layout' : ''}`}><a className="skip" href="#main">Ir para conteúdo</a>
    {workspace ? <aside className="sidebar"><Link to="/" aria-label="Point Media · Início" className="sidebar-brand"><PointMark/></Link><nav aria-label="Área de trabalho"><NavLink to="/conta">minha conta</NavLink>{session.data?.role === 'CANDIDATE' ? <NavLink to="/vagas">oportunidades</NavLink> : <><NavLink to="/rh/candidatos">candidatos</NavLink><NavLink to="/rh/vagas">vagas</NavLink>{session.data?.role === 'ADMIN' && <NavLink to="/admin/recrutadores">recrutadores</NavLink>}</>}</nav><div className="sidebar-footer">{session.data?.role === 'CANDIDATE' && <NavLink className="profile-link" to="/perfil">meu perfil</NavLink>}<button className="sidebar-logout" onClick={() => logout.mutate()} disabled={logout.isPending}>sair da conta</button></div></aside> : !authPage &&
      <header className="public-header"><Link to="/" className="brand"><PointMark/><span>Trabalhe conosco</span></Link><nav aria-label="Principal">{pathname !== '/' && <Link to="/vagas">Vagas</Link>}{session.data ? <><Link to="/conta">Minha conta</Link><button onClick={() => logout.mutate()} disabled={logout.isPending}>Sair</button></> : <Link className="login-link" to="/entrar">login</Link>}</nav></header>}
    <main id="main">{logout.error && <p role="alert" className="error">{logout.error.message}</p>}<Outlet/></main>{!workspace && !authPage && <footer><span>© {new Date().getFullYear()} Point Media - Sistema de Banco de Talentos</span><nav aria-label="Rodapé"><Link to="/vagas">Vagas abertas</Link><Link to="/cadastro">Banco de talentos</Link></nav><PointMark/></footer>}</div>;
}
function Account() {
  const { data } = useSession();
  return <><h1>Minha conta</h1><section className="account-profile"><div className="avatar-row"><div className="avatar" aria-hidden="true">{(data?.name ?? data?.email ?? 'PM').slice(0, 2).toUpperCase()}</div><div><h2>{data?.name ?? 'Equipe Point Media'}</h2><p className="muted">{data?.role === 'CANDIDATE' ? 'Conta do candidato' : data?.role === 'ADMIN' ? 'Conta do administrador' : 'Conta do recrutador'}</p></div></div><div className="form-grid"><Field id="account-name" label="Nome"><input id="account-name" readOnly value={data?.name ?? ''} placeholder="Não informado"/></Field><Field id="account-email" label="E-mail"><input id="account-email" readOnly value={data?.email ?? ''}/></Field><div className="account-context"><Field id="account-company" label="Empresa"><input id="account-company" readOnly value="Point Media"/></Field></div><div className="account-context"><Field id="account-role" label="Permissão"><input id="account-role" readOnly value={data?.role === 'CANDIDATE' ? 'Candidato' : data?.role === 'ADMIN' ? 'Administrador' : 'Recrutador'}/></Field></div></div><div className="actions account-actions">{data?.role === 'CANDIDATE' ? <><Link className="button" to="/perfil">Editar perfil e currículo</Link><Link className="button secondary" to="/vagas">Explorar vagas</Link></> : <><Link className="button" to="/rh/vagas">Gerenciar vagas</Link><Link className="button secondary" to="/rh/candidatos">Consultar candidatos</Link></>}</div></section></>;
}
function Login() {
  const [params] = useSearchParams();
  return <>{params.get('cadastro') === 'ok' && <p role="status">Conta criada. Entre com seu e-mail e senha.</p>}<AuthForm/></>;
}
export function App() {
  return <Routes><Route element={<Layout/>}>
    <Route index element={<Home/>}/>
    <Route path="entrar" element={<Login/>}/><Route path="cadastro" element={<AuthForm registerMode/>}/>
    <Route path="conta" element={<Protected roles={['ADMIN', 'RECRUITER', 'CANDIDATE']}><Account/></Protected>}/>
    <Route path="perfil" element={<Protected roles={['CANDIDATE']}><ProfilePage/></Protected>}/>
    <Route path="vagas" element={<PublicJobs/>}/><Route path="vagas/:id" element={<JobDetails/>}/>
    <Route path="rh/vagas" element={<Protected roles={['ADMIN', 'RECRUITER']}><RecruitmentJobs/></Protected>}/>
    <Route path="rh/vagas/nova" element={<Protected roles={['ADMIN', 'RECRUITER']}><><h1>Gestão de vagas</h1><JobEditor/></></Protected>}/>
    <Route path="rh/vagas/:id" element={<Protected roles={['ADMIN', 'RECRUITER']}><EditJobPage/></Protected>}/>
    <Route path="rh/candidatos" element={<Protected roles={['ADMIN', 'RECRUITER']}><RecruitmentCandidates/></Protected>}/>
    <Route path="rh/candidatos/:id" element={<Protected roles={['ADMIN', 'RECRUITER']}><CandidateDetails/></Protected>}/>
    <Route path="admin/recrutadores" element={<Protected roles={['ADMIN']}><RecruiterForm/></Protected>}/>
    <Route path="*" element={<section><h1>Página não encontrada</h1><Link to="/">Ir para início</Link></section>}/>
  </Route></Routes>;
}
