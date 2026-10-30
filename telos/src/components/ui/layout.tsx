import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, eyebrow, actions, children }: { title: string; eyebrow?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong px-6 py-10">
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-prose text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="num text-xl font-semibold">{value}</span>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}

/** Paginación por query string (?page=N), conservando los demás filtros. */
export function Pagination({ page, pageSize, total, params }: { page: number; pageSize: number; total: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-muted">{total} registro(s)</p>;
  const href = (p: number) => "?" + new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), page: String(p) } as Record<string, string>).toString();
  return (
    <nav className="mt-3 flex items-center justify-between text-sm" aria-label="Paginación">
      <span className="text-muted">
        Página {page} de {pages} · {total} registros
      </span>
      <div className="flex gap-2">
        {page > 1 && <Link className="rounded border border-line px-2 py-1 hover:bg-paper" href={href(page - 1)}>Anterior</Link>}
        {page < pages && <Link className="rounded border border-line px-2 py-1 hover:bg-paper" href={href(page + 1)}>Siguiente</Link>}
      </div>
    </nav>
  );
}
