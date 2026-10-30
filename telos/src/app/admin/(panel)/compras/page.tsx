import Link from "next/link";
import type { PurchaseStatus } from "@prisma/client";
import { formatDate } from "@/lib/dates";
import { formatHNL } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { listPurchases } from "@/server/services/purchases";
import { PURCHASE_STATUS_LABELS } from "@/server/services/purchase-rules";
import { LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { PurchaseStatusBadge } from "@/components/admin/status";

export const metadata = { title: "Compras" };

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("purchases:read");
  const sp = await searchParams;
  const { items, total, page, pageSize } = await listPurchases({ q: sp.q, status: sp.estado as PurchaseStatus | undefined, page: Number(sp.page) || 1 });
  return (
    <>
      <PageHeader eyebrow="Comprar" title="Compras" actions={can(user.role, "purchases:write") && <LinkButton href="/admin/compras/nueva">Nueva compra</LinkButton>} />
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        <Input name="q" defaultValue={sp.q} placeholder="Código (TEL-C-…) o proveedor" aria-label="Buscar" />
        <Select name="estado" defaultValue={sp.estado ?? ""} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(PURCHASE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <button className="h-9 rounded-md border border-line-strong px-3 text-sm hover:bg-surface">Filtrar</button>
      </form>
      {items.length === 0 ? (
        <EmptyState title="No hay compras registradas." body="Registra la mercancía que compras; al recibirla, el inventario y el costo real se actualizan solos." action={can(user.role, "purchases:write") && <LinkButton href="/admin/compras/nueva">Registrar primera compra</LinkButton>} />
      ) : (
        <Table>
          <thead><tr><Th>Código</Th><Th>Fecha</Th><Th>Proveedor</Th><Th className="text-right">Líneas</Th><Th className="text-right">Total</Th><Th>Estado</Th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-paper/60">
                <Td className="num"><Link href={`/admin/compras/${p.id}`} className="hover:underline">{p.code}</Link></Td>
                <Td className="num text-xs text-muted">{formatDate(p.orderedAt)}</Td>
                <Td>{p.supplier?.name ?? <span className="text-muted">—</span>}</Td>
                <Td className="num text-right">{p._count.items}</Td>
                <Td className="num text-right">{formatHNL(p.total)}</Td>
                <Td><PurchaseStatusBadge status={p.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} params={{ q: sp.q, estado: sp.estado }} />
    </>
  );
}
