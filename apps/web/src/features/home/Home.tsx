import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wordmark } from '../../components/ui/Brand';
import { api } from '../../services/api';
import { type Job, type Page } from '../../lib/domain';
import { PublicJobs } from '../jobs/JobsPages';

export function Home() {
  const vacancies = useQuery({ queryKey: ['jobs', 'home-count'], queryFn: () => api<Page<Job>>('/jobs?pageSize=1') });
  return <>
    <section className="hero"><div className="home-container"><div className="hero-grid"><div className="hero-copy"><Wordmark/><h1>Conecte seu talento<br/>à comunicação do futuro</h1><div className="accent-line"/><p>Veja vagas, envie seu perfil e apresente seu talento com uma experiência simples, transparente e digital.</p><div className="actions"><Link className="button" to="/vagas">Ver vagas abertas</Link><Link className="button light" to="/cadastro">Banco de talentos</Link></div></div>
      <div className="hero-card"><h2>Processo seletivo digital</h2><p className="muted">Suas informações profissionais, organizadas em um só lugar.</p><ol><li><strong>Cadastre-se</strong><span>Crie sua conta para apresentar seu talento à Point Media.</span></li><li><strong>Complete seu perfil</strong><span>Adicione competências, experiências e seu currículo atualizado.</span></li><li><strong>Conecte-se</strong><span>Explore vagas e conheça os requisitos de cada oportunidade.</span></li></ol></div></div>
      <div className="home-metrics" aria-label="Informações da plataforma"><article><strong>{vacancies.data?.total ?? '—'}</strong><span>{vacancies.error ? 'consulte as vagas abaixo' : 'vagas abertas'}</span></article><article><strong>PDF / DOCX</strong><span>formatos de currículo</span></article><article><strong>Privado</strong><span>acesso ao seu currículo</span></article><article><strong>Digital</strong><span>seu perfil em um só lugar</span></article></div>
    </div></section>
    <div className="home-container home-body"><PublicJobs embedded/>
      <section className="benefits" id="sobre"><h2>Por que criar seu perfil?</h2><p>O banco de talentos mantém suas informações organizadas para novas oportunidades e facilita o contato com a equipe.</p><div className="benefit-grid"><article><span aria-hidden="true">01</span><div><h3>Seu perfil atualizado</h3><p>Reúna suas competências e experiências para apresentar sua trajetória profissional.</p></div></article><article><span aria-hidden="true">02</span><div><h3>Oportunidades à vista</h3><p>Conheça as vagas abertas e consulte os requisitos e os prazos de cada posição.</p></div></article><article><span aria-hidden="true">03</span><div><h3>Currículo protegido</h3><p>Compartilhe seu currículo com a equipe autorizada de recrutamento da Point Media.</p></div></article></div></section>
      <section className="join-banner"><div><h2>Não encontrou uma vaga ideal?</h2><p>Cadastre-se mesmo assim no nosso Banco de Talentos. Com sua autorização, seu perfil poderá ser considerado em futuras oportunidades.</p></div><Link className="button light" to="/cadastro">Cadastrar</Link></section>
    </div>
  </>;
}
