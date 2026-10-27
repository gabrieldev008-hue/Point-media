const { test } = require('node:test');
const assert = require('node:assert/strict');
const { permits, normalizeEmail, trustedOrigin } = require('../index.cjs');
test('candidate cannot enter recruiter or admin endpoints', () => {
  assert.equal(permits('CANDIDATE', ['RECRUITER', 'ADMIN']), false);
  assert.equal(permits('CANDIDATE', ['ADMIN']), false);
});
test('recruiter cannot enter administrator endpoints', () => {
  assert.equal(permits('RECRUITER', ['ADMIN']), false);
  assert.equal(permits('RECRUITER', ['RECRUITER', 'ADMIN']), true);
});
test('unknown roles and unspecified permissions deny access', () => {
  assert.equal(permits('OWNER', ['ADMIN']), false);
  assert.equal(permits('ADMIN', []), false);
});
test('email case/whitespace cannot bypass normalization', () => {
  assert.equal(normalizeEmail('  Talent@Example.test '), 'talent@example.test');
});
test('unsafe requests require exact trusted origin', () => {
  const expected = 'https://talentos.example.test';
  for (const origin of [undefined, 'null', expected + '.evil.test', 'http://talentos.example.test']) {
    assert.equal(trustedOrigin(origin, expected), false);
  }
  assert.equal(trustedOrigin(expected, expected), true);
});
