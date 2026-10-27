const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { applyMigrations } = require('../scripts/migrate-local.cjs');
test('local migrations are transactional, repeatable and reject changed SQL', (t) => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const initial = { name: '001', sql: 'CREATE TABLE Example(id TEXT PRIMARY KEY);' };
  assert.deepEqual(applyMigrations(db, [initial]), ['001']);
  assert.deepEqual(applyMigrations(db, [initial]), []);
  assert.throws(() => applyMigrations(db, [{ ...initial, sql: initial.sql + '\n' }]), /checksum/);
  assert.throws(() => applyMigrations(db, [initial, { name: '002', sql: 'CREATE TABLE Partial(id TEXT); INVALID SQL;' }]));
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE name = 'Partial'").get().total, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM _prisma_migrations').get().total, 1);
});
