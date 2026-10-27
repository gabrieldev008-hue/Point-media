export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin',
      headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  } catch { throw new ApiError(0, 'Não foi possível conectar ao servidor. Tente novamente.'); }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const value = body && typeof body === 'object' && 'message' in body ? body.message : null;
    throw new ApiError(response.status, typeof value === 'string' ? value : 'Não foi possível concluir a solicitação. Verifique os campos.');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
