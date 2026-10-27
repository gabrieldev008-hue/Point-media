import type { ReactNode } from 'react';
export function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}{error && <span id={`${id}-error`} className="error">{error}</span>}</div>;
}
export function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="error-panel"><p>{message}</p><button onClick={retry}>Tentar novamente</button></div>;
}
export function Pagination({ page, total, pageSize, change }: { page: number; total: number; pageSize: number; change: (page: number) => void }) {
  return <nav className="pagination" aria-label="Paginação"><button className="secondary" disabled={page <= 1} onClick={() => change(page - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span><button className="secondary" disabled={page * pageSize >= total} onClick={() => change(page + 1)}>Próxima</button></nav>;
}
