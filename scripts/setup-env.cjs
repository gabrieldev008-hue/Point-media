const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomBytes } = require('node:crypto');
const { parseEnv } = require('node:util');

const root = join(__dirname, '..');
const target = join(root, '.env');
let source = readFileSync(existsSync(target) ? target : join(root, '.env.example'), 'utf8');
const current = parseEnv(source);
const requirements = [
  { key: 'JWT_SECRET', minimum: 48, maximum: Infinity, generate: () => randomBytes(48).toString('hex') },
  ...['ADMIN', 'RECRUITER', 'CANDIDATE'].map((role) => ({
    key: `SEED_${role}_PASSWORD`, minimum: 12, maximum: 128,
    generate: () => randomBytes(24).toString('base64url'),
  })),
];
for (const { key, minimum, maximum } of requirements) {
  const value = current[key];
  if (value && (value.length < minimum || value.length > maximum)) {
    throw new Error(`${key} already has a value with invalid length. Correct it in .env; no value was overwritten.`);
  }
}
let generated = 0;
for (const { key, generate } of requirements) {
  if (current[key]) continue;
  const replacement = `${key}=${generate()}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  source = pattern.test(source) ? source.replace(pattern, replacement) : `${source}\n${replacement}\n`;
  generated++;
}
if (!existsSync(target) || generated) writeFileSync(target, source, { encoding: 'utf8', mode: 0o600 });
console.log(`Environment ready. Generated ${generated} missing secrets. Existing values preserved.`);
console.log('View .env locally for seed passwords. Do not share this file.');
