import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import type { CurrentUser } from '@pointmedia/shared';
import { api } from '../../services/api';
import { sessionKey } from './session';
import { useState } from 'react';
import { PointMark } from '../../components/ui/Brand';
const schema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(12, 'Use pelo menos 12 caracteres').max(128, 'Use até 128 caracteres'),
  name: z.string().trim().min(2, 'Informe seu nome').max(120).optional(),
  talentConsent: z.boolean(),
});
type Values = z.infer<typeof schema>;
export function AuthForm({ registerMode = false }: { registerMode?: boolean }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { talentConsent: false },
  });
  const mutation = useMutation({ mutationFn: async (values: Values) => {
    const payload = registerMode ? values : { email: values.email, password: values.password };
    return api<CurrentUser>(`/auth/${registerMode ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
  }, onSuccess: (user) => {
    if (registerMode) { navigate('/entrar?cadastro=ok'); }
    else { client.setQueryData(sessionKey, user); navigate('/conta'); }
  } });
  return <section className={`auth-screen${registerMode ? ' registration-screen' : ''}`} aria-labelledby="auth-title">
    <Link className="auth-back" to="/" aria-label="Voltar ao início"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Voltar</Link>
    <div className="auth-heading"><Link to="/" aria-label="Point Media · Voltar ao início"><PointMark/></Link><h1 id="auth-title">{registerMode ? 'Criar conta de candidato' : 'realizar login'}</h1><p>{registerMode ? 'faça parte do banco de talentos Point Media' : 'insira seus dados para acessar o sistema'}</p></div>
    <div className="auth-card"><form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      {registerMode && <div><label htmlFor="name">Nome completo</label><input id="name" autoComplete="name" {...register('name')} aria-invalid={!!errors.name} aria-describedby="name-error"/><span id="name-error" className="error">{errors.name?.message}</span></div>}
      <div><label htmlFor="email">E-mail</label><input id="email" type="email" placeholder="digite seu e-mail" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} aria-describedby="email-error"/><span id="email-error" className="error">{errors.email?.message}</span></div>
      <div><label htmlFor="password">Senha</label><div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} placeholder="digite sua senha" autoComplete={registerMode ? 'new-password' : 'current-password'} {...register('password')} aria-invalid={!!errors.password} aria-describedby="password-error"/><button type="button" className="password-toggle" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><svg width="28" height="22" viewBox="0 0 28 22" fill="none" aria-hidden="true"><path d="M2 11S6 3 14 3s12 8 12 8-4 8-12 8S2 11 2 11Z" stroke="currentColor" strokeWidth="2"/><circle cx="14" cy="11" r="4" stroke="currentColor" strokeWidth="2"/>{showPassword && <path d="m3 2 22 18" stroke="currentColor" strokeWidth="2"/>}</svg></button></div><span id="password-error" className="error">{errors.password?.message}</span></div>
      {registerMode && <label className="checkbox"><input type="checkbox" {...register('talentConsent')}/>Autorizo manter meu perfil no banco de talentos para futuras oportunidades. Posso solicitar a retirada pelo canal da empresa.</label>}
      {mutation.error && <p role="alert" className="error">{mutation.error.message}</p>}
      <button className="auth-submit" disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Aguarde…' : registerMode ? 'Criar conta' : 'Entrar'}</button>
    </form></div>
    <p className="auth-switch"><Link to={registerMode ? '/entrar' : '/cadastro'}>{registerMode ? 'Já tenho conta' : 'Criar conta de candidato'}</Link></p>
  </section>;
}
