import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const environment = { ...parseEnv(readFileSync('.env', 'utf8')), ...process.env };
const testDatabase = environment.TEST_DATABASE_URL;
if (!testDatabase || !/^file:.+_test\.db$/.test(testDatabase) || testDatabase === environment.DATABASE_URL) {
  throw new Error('E2E requires a separate TEST_DATABASE_URL SQLite file ending in _test.db');
}
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run db:migrate && npm run dev', url: 'http://localhost:5173', reuseExistingServer: false, timeout: 120000,
    env: { DATABASE_URL: testDatabase, NODE_ENV: 'test', WEB_ORIGIN: 'http://localhost:5173' } },
});
