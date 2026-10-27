import { effectiveStatus } from './jobs.service';
describe('deadline boundary', () => {
  const closesAt = new Date('2026-12-01T15:00:00Z');
  it('is still published one millisecond before closing', () => {
    expect(effectiveStatus({ status: 'PUBLISHED', closesAt }, new Date(closesAt.getTime() - 1))).toBe('PUBLISHED');
  });
  it('is closed exactly at the deadline', () => {
    expect(effectiveStatus({ status: 'PUBLISHED', closesAt }, closesAt)).toBe('CLOSED');
  });
  it('does not publish a draft or reopen a cancelled vacancy', () => {
    expect(effectiveStatus({ status: 'DRAFT', closesAt }, closesAt)).toBe('DRAFT');
    expect(effectiveStatus({ status: 'CANCELLED', closesAt }, closesAt)).toBe('CANCELLED');
  });
});
