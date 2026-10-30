import type { ReactNode } from "react";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-3xl font-semibold tracking-[var(--tracking-brand)]">TELOS</p>
        <p className="mb-8 text-sm text-muted">Distribuidora Telos · Admin</p>
        <h1 className="mb-4 text-lg font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
