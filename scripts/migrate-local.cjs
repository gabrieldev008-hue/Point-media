const { DatabaseSync, backup } = require('node:sqlite');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { join, resolve, relative } = require('node:path');
const root = resolve(__dirname, '..');
function applyMigrations(db, migrations) {
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000');
  db.exec(`CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, finished_at DATETIME,
    migration_name TEXT NOT NULL, logs TEXT, rolled_back_at DATETIME,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, applied_steps_count INTEGER NOT NULL DEFAULT 0
  )`);
  const applied = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const { name, sql } of migrations) {
      const checksum = createHash('sha256').update(sql).digest('hex');
      const rows = db.prepare('SELECT checksum, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = ?').all(name);
      const done = rows.find((row) => row.finished_at && !row.rolled_back_at);
      if (done) {
        if (done.checksum !== checksum) throw new Error(`Migration checksum differs: ${name}`);
        continue;
      }
      if (rows.some((row) => !row.rolled_back_at)) throw new Error(`Unfinished migration: ${name}`);
      const started = Date.now();
      db.exec(sql);
      db.prepare('INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (?, ?, ?, ?, ?, 1)')
        .run(randomUUID(), checksum, name, started, Date.now());
      applied.push(name);
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign key integrity check failed');
    db.exec('COMMIT');
    return applied;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !/^file:.+\.db$/.test(url)) throw new Error('Configure DATABASE_URL as a SQLite .db file');
  if (process.env.NODE_ENV === 'production') throw new Error('Use the standard Prisma migration pipeline in production');
  const prisma = join(root, 'apps/api/prisma');
  const file = resolve(prisma, url.slice(5));
  const location = relative(root, file);
  if (location.startsWith('..') || require('node:path').isAbsolute(location)) throw new Error('Local migration database must be inside this project');
  const existing = existsSync(file);
  const db = new DatabaseSync(file);
  try {
    if (existing) {
      const snapshot = `${file}.${Date.now()}.backup`;
      await backup(db, snapshot);
      console.log('Private SQLite backup created before migration (ignored by Git).');
    }
    const directory = join(prisma, 'migrations');
    const migrations = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => ({
      name: entry.name, sql: readFileSync(join(directory, entry.name, 'migration.sql'), 'utf8'),
    })).sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Applied ${applyMigrations(db, migrations).length} migration(s).`);
  } finally { db.close(); }
}
module.exports = { applyMigrations };
if (require.main === module) main().catch(() => { console.error('Local migration failed. Check schema/checksums and database availability; transaction rolled back.'); process.exitCode = 1; });
