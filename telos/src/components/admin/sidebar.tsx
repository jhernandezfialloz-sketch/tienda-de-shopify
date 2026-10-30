"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./nav";

export function Sidebar({ groups, unread }: { groups: { group?: string; items: NavItem[] }[]; unread: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-5 text-sm">
      {groups.map((g, i) => (
        <div key={g.group ?? i}>
          {g.group && <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{g.group}</p>}
          <ul className="flex flex-col">
            {g.items.map((item) =>
              item.phase ? (
                <li key={item.href} className="flex items-center justify-between px-2 py-1.5 text-muted/70" title="Disponible en una fase posterior">
                  {item.label}
                  <span className="text-[10px] uppercase tracking-wider">{item.phase}</span>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 ${isActive(item.href) ? "bg-ink text-paper" : "text-ink-2 hover:bg-line/50"}`}
                  >
                    {item.label}
                    {item.href === "/admin/notificaciones" && unread > 0 && (
                      <span className="num rounded bg-danger px-1.5 text-[11px] text-white">{unread}</span>
                    )}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}
