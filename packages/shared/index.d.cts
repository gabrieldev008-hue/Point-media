export type Role = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
export interface CurrentUser { id: string; email: string; role: Role; name: string | null }
export const roles: readonly Role[];
export function normalizeEmail(email: string): string;
export function permits(role: string, allowed: readonly Role[]): boolean;
export function trustedOrigin(origin: unknown, expected: string): boolean;
