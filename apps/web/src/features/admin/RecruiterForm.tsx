import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '../../services/api';
const schema = z.object({ email: z.email('Informe um e-mail válido'), password: z.string().min(12, 'Use pelo menos 12 caracteres').max(128) });
type Values = z.infer<typeof schema>;
export function RecruiterForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const mutation = useMutation({ mutationFn: (values: Values) => api('/admin/recruiters', { method: 'POST', body: JSON.stringify(values) }), onSuccess: () => reset() });
  return <section className="card recruiter-form"><div className="registration-heading"><span className="tag">Acesso administrativo</span><h1>Cadastrar recrutador</h1></div>
    <p>A conta criada terá acesso restrito de RH. Compartilhe a senha inicial por canal seguro.</p>
    <form onSubmit={handleSubmit((values) => {
      if (window.confirm(`Criar acesso de recrutador para ${values.email}?`)) mutation.mutate(values);
    })} noValidate>
      <label htmlFor="recruiter-email">E-mail do recrutador</label><input id="recruiter-email" type="email" autoComplete="off" {...register('email')} aria-describedby="recruiter-email-error" aria-invalid={!!errors.email}/>
      <span className="error" id="recruiter-email-error">{errors.email?.message}</span>
      <label htmlFor="recruiter-password">Senha inicial</label><input id="recruiter-password" type="password" autoComplete="new-password" {...register('password')} aria-describedby="recruiter-password-error" aria-invalid={!!errors.password}/>
      <span className="error" id="recruiter-password-error">{errors.password?.message}</span>
      <button disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Cadastrar recrutador'}</button>
    </form>
    {mutation.isSuccess && <p role="status">Recrutador cadastrado.</p>}
    {mutation.error && <p role="alert" className="error">{mutation.error.message}</p>}
  </section>;
}
