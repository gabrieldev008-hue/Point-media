import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { userEvent } from '@testing-library/user-event';
import { getByLabelText, getByRole, getByText, findByRole, findByText, waitFor } from '@testing-library/dom';
import { localBrowser } from './helpers/local-browser.mjs';

// Uses fictitious accounts and jobs on the running local system, then removes them.
const env = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'));
const base = 'http://localhost:5173';
const password = randomUUID() + 'Aa!';
const email = `ui-${randomUUID()}@example.test`;
const browser = await localBrowser();
const { window, document, errors } = browser;
const user = userEvent.setup({ document });
const body = document.body;
async function login(email, password) {
  await findByRole(body, 'heading', { name: 'realizar login' });
  await user.type(getByLabelText(body, 'E-mail'), email);
  await user.type(getByLabelText(body, 'Senha'), password);
  await user.click(getByRole(body, 'button', { name: 'Entrar', exact: true }));
  await findByRole(body, 'heading', { name: 'Minha conta' }, { timeout: 10000 });
}
let staff;
let jobId;
let deleted = false;
try {
  const registered = await window.fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name: 'Talento UI Fictício', talentConsent: false }) });
  assert.equal(registered.status, 201);
  await login(email, password);
  await user.click(getByRole(body, 'link', { name: 'Editar perfil e currículo' }));
  await findByRole(body, 'heading', { name: 'Meu perfil profissional' });
  await user.type(getByLabelText(body, 'Localização'), 'Tatuí - SP');
  await user.type(getByLabelText(body, 'Pretensão salarial (R$)'), '4500,00');
  await user.selectOptions(getByLabelText(body, 'Senioridade'), 'MID');
  await user.type(getByLabelText(body, 'Tecnologias e ferramentas que domina'), 'React, Figma');
  await user.click(getByRole(body, 'button', { name: 'Adicionar experiência' }));
  await user.type(getByLabelText(body, 'Empresa'), 'Empresa fictícia');
  await user.type(getByLabelText(body, 'Cargo'), 'Designer');
  await user.type(getByLabelText(body, 'Início'), '2024-01-01');
  await user.click(getByRole(body, 'button', { name: 'Salvar alterações', exact: true }));
  await findByText(body, 'Perfil salvo com sucesso.', {}, { timeout: 10000 });
  const profile = await (await window.fetch('/api/candidates/me')).json();
  assert.equal(profile.salaryCents, 450000); assert.equal(profile.experiences.length, 1);
  const pdf = new window.File(['%PDF-1.4\n1 0 obj<</Type /Catalog>>endobj\n%%EOF'], 'curriculo.pdf', { type: 'application/pdf' });
  await user.upload(getByLabelText(body, 'Anexar currículo'), pdf);
  await user.click(getByRole(body, 'button', { name: 'Enviar currículo', exact: true }));
  await findByText(body, 'Currículo enviado.', {}, { timeout: 10000 });
  await findByRole(body, 'link', { name: 'Baixar currículo' });
  console.log('Profile editing and private PDF upload passed through the production UI.');

  staff = await localBrowser();
  const staffUser = userEvent.setup({ document: staff.document }), staffBody = staff.document.body;
  await findByRole(staffBody, 'heading', { name: 'realizar login' });
  await staffUser.type(getByLabelText(staffBody, 'E-mail'), 'rh@example.test');
  await staffUser.type(getByLabelText(staffBody, 'Senha'), env.SEED_RECRUITER_PASSWORD);
  await staffUser.click(getByRole(staffBody, 'button', { name: 'Entrar', exact: true }));
  await findByRole(staffBody, 'heading', { name: 'Minha conta' });
  await staffUser.click(getByRole(staffBody, 'link', { name: 'Gerenciar vagas' }));
  await findByRole(staffBody, 'heading', { name: 'Gestão de vagas' });
  await staffUser.click(getByRole(staffBody, 'link', { name: 'Criar vaga', exact: true }));
  await findByRole(staffBody, 'heading', { name: 'Nova vaga' });
  const title = `Oportunidade UI ${randomUUID().slice(0, 8)}`;
  await staffUser.type(getByLabelText(staffBody, 'Título'), title);
  await staffUser.type(getByLabelText(staffBody, 'Descrição da oportunidade'), 'Vaga fictícia para testar a interface conectada à API.');
  await staffUser.type(getByLabelText(staffBody, 'Departamento'), 'Testes');
  await staffUser.type(getByLabelText(staffBody, 'Tecnologias obrigatórias'), 'Figma');
  await staffUser.click(getByRole(staffBody, 'button', { name: 'Salvar rascunho' }));
  await findByRole(staffBody, 'heading', { name: title }, { timeout: 10000 });
  const jobs = await (await staff.window.fetch(`/api/recruitment/jobs?search=${encodeURIComponent(title)}`)).json();
  jobId = jobs.items[0].id;
  const article = getByRole(staffBody, 'heading', { name: title }).closest('article');
  await staffUser.click(getByRole(article, 'button', { name: 'Publicar vaga' }));
  await waitFor(() => assert.equal(getByRole(article, 'button', { name: 'Encerrar vaga' }).textContent, 'Encerrar vaga'), { container: staffBody, timeout: 10000 });
  const publicResponse = await fetch(base + `/api/jobs/${jobId}`); assert.equal(publicResponse.status, 200);
  assert.equal((await publicResponse.json()).title, title);
  console.log('Recruiter creates and publishes a vacancy through the UI; public API shows it.');

  await user.click(getByText(body, 'Excluir minha conta e meus dados profissionais'));
  await user.type(getByLabelText(body, 'Confirme sua senha atual'), password);
  await user.click(getByRole(body, 'button', { name: 'Excluir minha conta', exact: true }));
  await findByRole(body, 'heading', { name: /Conecte seu talento/ }, { timeout: 10000 });
  deleted = true;
  assert.equal((await window.fetch('/api/auth/me')).status, 401);
  assert.deepEqual(errors, []); assert.deepEqual(staff.errors, []);
  console.log('Candidate account deletion through the UI passed; session revoked.');
} finally {
  if (staff && jobId) {
    // Remove only this explicitly identified fictitious UI test vacancy, never user data.
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
    try { await db.jobOpening.deleteMany({ where: { id: jobId, department: { name: 'Testes' } } }); }
    finally { await db.$disconnect(); }
  }
  if (!deleted) await window.fetch('/api/candidates/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }).catch(() => {});
  window.close(); staff?.window.close();
}
