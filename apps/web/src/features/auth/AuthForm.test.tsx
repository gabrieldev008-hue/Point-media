import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthForm } from './AuthForm';
function mount(registerMode = false) {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthForm registerMode={registerMode}/></MemoryRouter></QueryClientProvider>);
}
it('rejects invalid inputs before sending a request', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  mount();
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Informe um e-mail válido')).toBeVisible();
  expect(fetchSpy).not.toHaveBeenCalled();
});
it('sends structured registration and optional consent to real API adapter', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: '1', role: 'CANDIDATE' }), { status: 201 }));
  mount(true);
  await userEvent.type(screen.getByLabelText('Nome completo'), 'Pessoa Teste');
  await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@example.test');
  await userEvent.type(screen.getByLabelText('Senha'), 'UmaSenhaLonga123!');
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: JSON.stringify({ email: 'pessoa@example.test', password: 'UmaSenhaLonga123!', name: 'Pessoa Teste', talentConsent: false }) })));
});
