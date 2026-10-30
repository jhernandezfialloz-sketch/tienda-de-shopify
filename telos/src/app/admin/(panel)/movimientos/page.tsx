import Link from "next/link";
import type { MovementType } from "@prisma/client";
import { formatDateTime } from "@/lib/dates";
import { requireUser } from "@/server/auth/current";
import { listMovements } from "@/server/services/inventory-queries";
import { MOVEMENT_LABELS } from "@/server/services/inventory";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";

export const metadata = { title: "Movimientos" };

const REF_HREF: Record<string, string> = { sale: "/admin/ventas/", purchase: "/admin/compras/" };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("inventory:read");
  const sp = await searchParams;
  const { items, total, page, pageSize } = await listMovements({ variantId: sp.variante, type: sp.tipo, page: Number(sp.page) || 1 });

  return (
    <>
      <PageHeader eyebrow="Operar" title="Movimientos de inventario">
        <p className="mt-1 text-sm text-muted">Historial inmutable: cada cambio de stock con antes, cambio, después, responsable y razón.</p>
      </PageHeader>
      <form className="mb-4 flex gap-2">
        {sp.variante && <input type="hidden" name="variante" value={sp.variante} />}
        <Select name="tipo" defaultValue={sp.tipo ?? ""} className="max-w-60" aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>)}
        </Select>
        <button className="h-9 rounded-md border border-line-strong px-3 text-sm hover:bg-surface">Filtrar</button>
        {sp.variante && <Link href="/admin/movimientos" className="flex h-9 items-center px-2 text-sm text-muted hover:text-ink">Quitar filtro de variante</Link>}
      </form>
      {items.length === 0 ? (
        <EmptyState title="No hay movimientos registrados." />
      ) : (
        <Table>
          <thead>
            <tr><Th>Fecha</Th><Th>SKU</Th><Th>Tipo</Th><Th className="text-right">Antes</Th><Th className="text-right">Cambio</Th><Th className="text-right">Después</Th><Th>Razón / referencia</Th><Th>Usuario</Th></tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <Td className="num whitespace-nowrap text-xs text-muted">{formatDateTime(m.createdAt)}</Td>
                <Td className="num whitespace-nowrap"><Link href={`?variante=${m.variantId}`} className="hover:underline">{m.variant.sku}</Link></Td>
                <Td className="whitespace-nowrap">{MOVEMENT_LABELS[m.type]}</Td>
                <Td className="num text-right">{m.quantityBefore}</Td>
                <Td className={`num text-right font-semibold ${m.quantityChange < 0 ? "text-danger" : "text-ok"}`}>{m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}</Td>
                <Td className="num text-right">{m.quantityAfter}</Td>
                <Td>
                  {m.referenceType && m.referenceId && REF_HREF[m.referenceType] ? (
                    <Link href={REF_HREF[m.referenceType] + m.referenceId} className="text-olive hover:underline">{m.reason}</Link>
                  ) : (
                    m.reason
                  )}
                </Td>
                <Td className="whitespace-nowrap">{m.user?.name ?? "Sistema"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} params={{ variante: sp.variante, tipo: sp.tipo }} />
    </>
  );
}
