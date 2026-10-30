import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/current";
import { can, ROLE_LABELS } from "@/server/auth/permissions";
import { logoutAction } from "@/server/actions/auth";
import { NAV } from "@/components/admin/nav";
import { Sidebar } from "@/components/admin/sidebar";
import { CommandPalette, PaletteButton } from "@/components/admin/command-palette";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(user.role, i.permission)) })).filter((g) => g.items.length > 0);
  const unread = await db.notification.count({ where: { readAt: null } });

  const brand = (
    <Link href="/admin" className="block">
      <span className="text-xl font-semibold tracking-[var(--tracking-brand)]">TELOS</span>
      <span className="block text-[11px] text-muted">Distribuidora Telos</span>
    </Link>
  );
  const account = (
    <div className="flex items-center justify-between gap-2 border-t border-line pt-4 text-sm">
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
      </div>
      <form action={logoutAction}>
        <button className="text-xs text-muted hover:text-ink">Salir</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line px-4 py-6 lg:flex">
        {brand}
        <PaletteButton />
        <div className="flex-1">
          <Sidebar groups={groups} unread={unread} />
        </div>
        {account}
      </aside>

      {/* Móvil: barra superior + menú desplegable + acceso rápido a nueva venta */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        {brand}
        <div className="flex items-center gap-2">
          {can(user.role, "sales:write") && (
            <Link href="/admin/ventas/nueva" className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper">+ Venta</Link>
          )}
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-md border border-line-strong px-3 py-1.5 text-sm">Menú</summary>
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-line bg-surface p-4 shadow-xl">
              <div className="mb-4"><PaletteButton /></div>
              <Sidebar groups={groups} unread={unread} />
              <div className="mt-4">{account}</div>
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      <CommandPalette />
    </div>
  );
}
