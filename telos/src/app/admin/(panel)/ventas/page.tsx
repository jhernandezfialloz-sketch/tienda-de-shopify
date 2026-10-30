import Link from "next/link";
import type { SaleStatus } from "@prisma/client";
import { formatDateTime } from "@/lib/dates";
import { formatHNL } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { listSales } from "@/server/services/sales";
import { SALE_STATUS_LABELS } from "@/server/services/sale-rules";
import { LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { CHANNEL_LABELS, PaymentBadge, SaleStatusBadge } from "@/components/admin/status";

export const metadata = { title: "Ventas" };

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("sales:read");
  const sp = await searchParams;
  const { items, total, page, pageSize } = await listSales({ q: sp.q, status: sp.estado as SaleStatus | undefined, channel: sp.canal, page: Number(sp.page) || 1 });
  const finance = can(user.role, "finance:read");

  return (
    <>
      <PageHeader eyebrow="Vender" title="Ventas" actions={can(user.role, "sales:write") && <LinkButton href="/admin/ventas/nueva">Nueva venta</LinkButton>} />
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_180px_auto]">
        <Input name="q" defaultValue={sp.q} placeholder="Código (TEL-V-…) o cliente" aria-label="Buscar" />
        <Select name="estado" defaultValue={sp.estado ?? ""} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(SALE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Select name="canal" defaultValue={sp.canal ?? ""} aria-label="Canal">
          <option value="">Todos los canales</option>
          {Object.entries(CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <button className="h-9 rounded-md border border-line-strong px-3 text-sm hover:bg-surface">Filtrar</button>
      </form>
      {items.length === 0 ? (
        <EmptyState
          title="No existen ventas registradas todavía."
          action={can(user.role, "sales:write") && <LinkButton href="/admin/ventas/nueva">Registrar primera venta</LinkButton>}
        />
      ) : (
        <Table>
          <thead>
            <tr><Th>Código</Th><Th>Fecha</Th><Th>Cliente</Th><Th className="hidden sm:table-cell">Canal</Th><Th className="text-right">Total</Th>{finance && <Th className="hidden text-right md:table-cell">Utilidad</Th>}<Th>Estado</Th></tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="hover:bg-paper/60">
                <Td className="num whitespace-nowrap"><Link href={`/admin/ventas/${s.id}`} className="hover:underline">{s.code}</Link>{s.isDemo && <span className="ml-1 text-[10px] text-warn">DEMO</span>}</Td>
                <Td className="num whitespace-nowrap text-xs text-muted">{formatDateTime(s.soldAt)}</Td>
                <Td>{s.customer?.name ?? <span className="text-muted">—</span>}</Td>
                <Td className="hidden sm:table-cell">{CHANNEL_LABELS[s.channel]}</Td>
                <Td className="num text-right whitespace-nowrap">{formatHNL(s.total)}</Td>
                {finance && <Td className="num hidden text-right md:table-cell">{s.grossProfit ? formatHNL(s.grossProfit) : <span className="text-muted">—</span>}</Td>}
                <Td><span className="flex flex-wrap gap-1"><SaleStatusBadge status={s.status} /><PaymentBadge status={s.paymentStatus} /></span></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} params={{ q: sp.q, estado: sp.estado, canal: sp.canal }} />
    </>
  );
}
