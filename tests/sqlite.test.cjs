const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync, mkdtempSync, unlinkSync, rmdirSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const migration = readFileSync(join(__dirname, '../apps/api/prisma/migrations/202610270001_foundation/migration.sql'), 'utf8');
function database(t) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(migration);
  t.after(() => db.close());
  return db;
}
function insert(db, id = 'user-1', email = 'candidate@example.test', role = 'CANDIDATE') {
  db.prepare('INSERT INTO "User" (id, email, passwordHash, role, updatedAt) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, 'test-hash', role, new Date().toISOString());
}
test('SQLite migration persists account across closing and reopening the file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'pointmedia-sqlite-'));
  const file = join(directory, 'persistence_test.db');
  let db;
  try {
    db = new DatabaseSync(file);
    db.exec(migration);
    insert(db);
    db.close(); db = undefined;
    db = new DatabaseSync(file);
    assert.equal(db.prepare('SELECT email, role FROM "User"').get().email, 'candidate@example.test');
    assert.equal(db.prepare('SELECT email, role FROM "User"').get().role, 'CANDIDATE');
  } finally {
    db?.close(); unlinkSync(file); rmdirSync(directory);
  }
});
test('database rejects duplicate and non-normalized emails and invalid roles', (t) => {
  const db = database(t); insert(db);
  assert.throws(() => insert(db, 'duplicate'), /UNIQUE/);
  assert.throws(() => insert(db, 'uppercase', 'OTHER@example.test'), /CHECK/);
  assert.throws(() => insert(db, 'invalid', 'other@example.test', 'OWNER'), /CHECK/);
});
test('profile and session require real users and cascade on account deletion', (t) => {
  const db = database(t); insert(db);
  const profile = db.prepare('INSERT INTO CandidateProfile (id, userId, name) VALUES (?, ?, ?)');
  assert.throws(() => profile.run('orphan', 'missing', 'Pessoa'), /FOREIGN KEY/);
  profile.run('profile', 'user-1', 'Pessoa');
  assert.throws(() => profile.run('duplicate', 'user-1', 'Pessoa'), /UNIQUE/);
  db.prepare('INSERT INTO AuthSession (id, userId, expiresAt) VALUES (?, ?, ?)').run('session', 'user-1', new Date().toISOString());
  db.prepare('INSERT INTO AuditLog (id, actorId, action) VALUES (?, ?, ?)').run('audit', 'user-1', 'LOGIN');
  db.prepare('DELETE FROM "User" WHERE id = ?').run('user-1');
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM CandidateProfile').get().total, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM AuthSession').get().total, 0);
  assert.equal(db.prepare('SELECT actorId FROM AuditLog').get().actorId, null);
});
test('Phase 2 migration preserves existing candidates and consent dates', (t) => {
  const db = database(t); insert(db);
  db.prepare('INSERT INTO CandidateProfile (id, userId, name, talentConsentAt) VALUES (?, ?, ?, ?)').run('profile', 'user-1', 'Talento Original', '2026-10-01T00:00:00Z');
  db.exec(readFileSync(join(__dirname, '../apps/api/prisma/migrations/202610270002_profiles_jobs/migration.sql'), 'utf8'));
  const profile = db.prepare('SELECT name, talentConsentAt, salaryCents FROM CandidateProfile').get();
  assert.equal(profile.name, 'Talento Original'); assert.equal(profile.talentConsentAt, '2026-10-01T00:00:00Z'); assert.equal(profile.salaryCents, null);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});
