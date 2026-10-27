import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
const prisma = new PrismaClient();
async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
  const accounts = [
    { email: 'admin@example.test', role: Role.ADMIN, password: process.env.SEED_ADMIN_PASSWORD },
    { email: 'rh@example.test', role: Role.RECRUITER, password: process.env.SEED_RECRUITER_PASSWORD },
    { email: 'candidato@example.test', role: Role.CANDIDATE, password: process.env.SEED_CANDIDATE_PASSWORD },
  ];
  for (const account of accounts) {
    if (!account.password || account.password.length < 12 || account.password.length > 128) throw new Error(`Set seed password (12–128 characters) for ${account.role}`);
  }
  for (const account of accounts) {
    const passwordHash = await argon2.hash(account.password!, { type: argon2.argon2id });
    await prisma.user.upsert({ where: { email: account.email }, update: {}, create: {
      email: account.email, role: account.role, passwordHash,
      ...(account.role === Role.CANDIDATE ? { profile: { create: { name: 'Talento Fictício', talentConsentAt: new Date() } } } : {}),
    } });
  }
}
void seed().catch((error: unknown) => {
  if (error instanceof Error && error.message.startsWith('Set seed password')) {
    console.error(`${error.message}. Run npm run env:setup to generate empty values.`);
  } else {
    console.error('Seed failed: check environment and database availability.');
  }
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
