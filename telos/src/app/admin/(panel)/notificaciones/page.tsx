import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { requireUser } from "@/server/auth/current";
import { markNotificationsReadAction } from "@/server/actions/parties";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout";

export const metadata = { title: "Notificaciones" };

const HREF: Record<string, (id: string) => string> = {
  variant: (id) => `/admin/movimientos?variante=${id}`,
  sale: (id) => `/admin/ventas/${id}`,
  product: (id) => `/admin/productos/${id}`,
};

export default async function NotificationsPage() {
  await requireUser();
  const items = await db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Notificaciones"
        actions={unread > 0 && <form action={markNotificationsReadAction}><Button variant="secondary">Marcar todas como leídas</Button></form>}
      />
      {items.length === 0 ? (
        <EmptyState title="Sin notificaciones." body="Aquí aparecerán alertas de stock bajo, productos agotados y ventas sin costo." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((n) => {
            const href = n.entityType && n.entityId ? HREF[n.entityType]?.(n.entityId) : undefined;
            return (
              <li key={n.id} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${n.readAt ? "opacity-60" : ""}`}>
                <div>
                  <p className="text-sm font-medium">{!n.readAt && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-danger" aria-label="No leída" />}{href ? <Link href={href} className="hover:underline">{n.title}</Link> : n.title}</p>
                  {n.body && <p className="text-sm text-muted">{n.body}</p>}
                </div>
                <time className="num text-xs text-muted">{formatDateTime(n.createdAt)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
