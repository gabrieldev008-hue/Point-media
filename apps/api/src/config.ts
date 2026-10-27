import { z } from 'zod';
import { resolve } from 'node:path';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().regex(/^file:.+\.db$/, 'Use a SQLite file URL ending in .db'),
  JWT_SECRET: z.string().min(48),
  STORAGE_DIRECTORY: z.string().min(1).default(resolve(__dirname, '../../../uploads/private')),
  WEB_ORIGIN: z.url().refine((value) => new URL(value).origin === value, 'Use origin without path'),
});
export type Environment = z.infer<typeof schema>;
export const ENV = Symbol('ENV');
export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.WEB_ORIGIN.startsWith('https://')) {
    throw new Error('Production WEB_ORIGIN must use HTTPS');
  }
  return parsed.data;
}
