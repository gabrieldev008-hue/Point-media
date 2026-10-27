import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { localBrowser } from './helpers/local-browser.mjs';
import { userEvent } from '@testing-library/user-event';
import { getByLabelText, getByRole, findByRole } from '@testing-library/dom';

// Exercises the generated production bundle and real HTTP API in a simulated DOM.
// This does not replace a browser test or visual/accessibility review.
const env = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'));
const { window, document, errors } = await localBrowser();
const user = userEvent.setup({ document });
try {
  await findByRole(document.body, 'heading', { name: 'realizar login' });
  await user.type(getByLabelText(document.body, 'E-mail'), 'candidato@example.test');
  await user.type(getByLabelText(document.body, 'Senha'), env.SEED_CANDIDATE_PASSWORD);
  await user.click(getByRole(document.body, 'button', { name: 'Entrar', exact: true }));
  await findByRole(document.body, 'heading', { name: 'Minha conta' }, { timeout: 10000 });
  assert.equal(window.location.pathname, '/conta');
  assert.equal(document.cookie.includes('pm_session'), false, 'session cookie must be HttpOnly');
  await user.click(getByRole(document.body, 'button', { name: 'sair da conta', exact: true }));
  await findByRole(document.body, 'heading', { name: 'realizar login' });
  assert.equal(window.location.pathname, '/entrar');
  const me = await window.fetch('/api/auth/me');
  assert.equal(me.status, 401);
  assert.deepEqual(errors, []);
  console.log('Production bundle + real API: login, account navigation, HttpOnly session and logout passed (simulated DOM).');
} finally { window.close(); }
