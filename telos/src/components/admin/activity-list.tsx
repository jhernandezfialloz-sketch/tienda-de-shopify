import { formatDateTime } from "@/lib/dates";

type Entry = { id: string; action: string; entityType: string; entityId: string; createdAt: Date; metadata: unknown; after: unknown; user: { name: string } | null };

const LABELS: Record<string, string> = {
  "auth.login": "inició sesión",
  "auth.password_reset": "restableció su contraseña",
  "product.create": "creó un producto",
  "product.update": "editó un producto",
  "product.archive": "archivó un producto",
  "product.image_add": "subió una foto",
  "product.image_remove": "eliminó una foto",
  "product.image_cover": "cambió la portada",
  "inventory.adjust": "ajustó inventario",
  "sale.create": "registró una venta",
  "sale.confirm": "confirmó una venta",
  "sale.entregada": "marcó una venta como entregada",
  "sale.cancelada": "canceló una venta",
  "sale.devuelta": "registró una devolución",
  "sale.payment": "registró un pago",
  "purchase.create": "registró una compra",
  "purchase.recibida": "recibió una compra",
  "purchase.ordenada": "marcó una compra como ordenada",
  "purchase.enviada": "marcó una compra como enviada",
  "purchase.cancelada": "canceló una compra",
  "customer.create": "creó un cliente",
  "customer.update": "editó un cliente",
  "supplier.create": "creó un proveedor",
  "supplier.update": "editó un proveedor",
};

const HREF: Record<string, (id: string) => string> = {
  product: (id) => `/admin/productos/${id}`,
  sale: (id) => `/admin/ventas/${id}`,
  purchase: (id) => `/admin/compras/${id}`,
  variant: (id) => `/admin/movimientos?variante=${id}`,
};

function detail(e: Entry): string | null {
  const after = e.after as Record<string, unknown> | null;
  const meta = e.metadata as Record<string, unknown> | null;
  if (e.action === "inventory.adjust" && after && meta) {
    return `${String(meta.type).toLowerCase()} · stock → ${String(after.onHand)} · ${String(meta.reason ?? "")}`;
  }
  if (after && typeof after.code === "string") return after.code;
  if (after && typeof after.name === "string") return after.name;
  return null;
}

export function ActivityList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted">Todavía no hay actividad registrada.</p>;
  return (
    <ol className="flex flex-col divide-y divide-line/70 text-sm">
      {entries.map((e) => {
        const href = HREF[e.entityType]?.(e.entityId);
        const d = detail(e);
        return (
          <li key={e.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
            <time className="num w-36 shrink-0 text-xs text-muted">{formatDateTime(e.createdAt)}</time>
            <span>
              <span className="font-medium">{e.user?.name ?? "Sistema"}</span> {LABELS[e.action] ?? e.action}
              {d && (href ? <a href={href} className="ml-1 text-olive underline-offset-2 hover:underline">{d}</a> : <span className="ml-1 text-muted">{d}</span>)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
