import { readEnvironment } from './config';
const valid = { DATABASE_URL: 'file:./pointmedia_test.db', JWT_SECRET: 's'.repeat(64), WEB_ORIGIN: 'http://localhost:5173' };
describe('environment validation', () => {
  it('rejects an obsolete PostgreSQL URL after adopting SQLite', () => {
    expect(() => readEnvironment({ ...valid, DATABASE_URL: 'postgresql://local/test' })).toThrow('DATABASE_URL');
  });
  it('fails closed when secrets are missing', () => {
    expect(() => readEnvironment({ ...valid, JWT_SECRET: '' })).toThrow('JWT_SECRET');
  });
  it('rejects non HTTPS production origin', () => {
    expect(() => readEnvironment({ ...valid, NODE_ENV: 'production' })).toThrow('HTTPS');
  });
  it('rejects origins with a path', () => {
    expect(() => readEnvironment({ ...valid, WEB_ORIGIN: 'https://example.test/app' })).toThrow('WEB_ORIGIN');
  });
  it('accepts local development with a long secret', () => {
    expect(readEnvironment(valid).PORT).toBe(3000);
  });
});
