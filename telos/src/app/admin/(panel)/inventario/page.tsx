import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { formatHNL, toCents } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { inventorySummary, listInventory } from "@/server/services/inventory-queries";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Pagination, Section, Stat } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { AdjustForm } from "@/components/admin/adjust-form";

export const metadata = { title: "Inventario" };

/** Antigüedad: días desde la última venta o, si nunca se vendió, desde la última entrada. */
function ageBucket(lastSale: Date | null, lastIn: Date | null): { days: number; label: string; tone: "neutral" | "warn" | "danger" } | null {
  const ref = lastSale ?? lastIn;
  if (!ref) return null;
  const days = Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
  if (days <= 30) return { days, label: "0–30 d", tone: "neutral" };
  if (days <= 60) return { days, label: "31–60 d", tone: "neutral" };
  if (days <= 90) return { days, label: "61–90 d", tone: "warn" };
  return { days, label: "90+ d", tone: "danger" };
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("inventory:read");
  const sp = await searchParams;
  const filter = (sp.filtro as "low" | "out" | undefined) ?? "all";
  const [summary, { rows, total, page, pageSize }] = await Promise.all([inventorySummary(), listInventory({ q: sp.q, filter, page: Number(sp.page) || 1 })]);
  const finance = can(user.role, "finance:read");
  const canAdjust = can(user.role, "inventory:adjust");
  const adjusting = sp.ajustar ? rows.find((r) => r.variant_id === sp.ajustar) : undefined;

  return (
    <>
      <PageHeader eyebrow="Operar" title="Inventario" />
      <div className="mb-6 grid grid-cols-2 rounded-lg border border-line bg-surface sm:grid-cols-4">
        <Stat label="Unidades" value={summary.units} />
        {finance && <Stat label="Valor a costo" value={formatHNL(toCents(summary.value_at_cost))} note={summary.variants_missing_cost ? `${summary.variants_missing_cost} variante(s) sin costo` : undefined} />}
        {finance && <Stat label="Valor a precio" value={formatHNL(toCents(summary.value_at_price))} />}
        <Stat label="Agotados / bajos" value={`${summary.out_of_stock} / ${summary.low_stock}`} />
      </div>

      {adjusting && canAdjust && (
        <Section title="Ajuste de inventario" className="mb-6" actions={<Link href="?" className="text-xs text-muted hover:text-ink">Cerrar</Link>}>
          <AdjustForm variantId={adjusting.variant_id} sku={adjusting.sku} onHand={adjusting.on_hand} />
        </Section>
      )}

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        <Input name="q" defaultValue={sp.q} placeholder="SKU, código, nombre o código de barras" aria-label="Buscar" />
        <Select name="filtro" defaultValue={filter} aria-label="Filtro">
          <option value="all">Todo el inventario</option>
          <option value="low">Stock bajo (≤ mínimo)</option>
          <option value="out">Agotados</option>
        </Select>
        <button className="h-9 rounded-md border border-line-strong px-3 text-sm hover:bg-surface">Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No hay variantes que mostrar." body="Crea productos con variantes o cambia los filtros." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>SKU</Th><Th>Producto</Th><Th className="text-right">Stock</Th><Th className="hidden text-right sm:table-cell">Reservado</Th>
              <Th className="text-right">Mín.</Th><Th className="hidden md:table-cell">Sin vender</Th>
              {finance && <Th className="hidden text-right md:table-cell">Valor a costo</Th>}
              {canAdjust && <Th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const low = r.minimum > 0 && r.on_hand <= r.minimum;
              const age = r.on_hand > 0 ? ageBucket(r.last_sale_at, r.last_in_at) : null;
              return (
                <tr key={r.variant_id} className={sp.ajustar === r.variant_id ? "bg-olive-soft/50" : "hover:bg-paper/60"}>
                  <Td className="num whitespace-nowrap"><Link href={`/admin/movimientos?variante=${r.variant_id}`} className="hover:underline">{r.sku}</Link></Td>
                  <Td>
                    <Link href={`/admin/productos/${r.product_id}`} className="hover:underline">{r.product_name}</Link>
                    <span className="block text-xs text-muted">{[r.color, r.size].filter(Boolean).join(" / ")}</span>
                  </Td>
                  <Td className={`num text-right font-semibold ${r.on_hand === 0 ? "text-danger" : low ? "text-warn" : ""}`}>{r.on_hand}</Td>
                  <Td className="num hidden text-right sm:table-cell">{r.reserved}</Td>
                  <Td className="num text-right text-muted">{r.minimum || "—"}</Td>
                  <Td className="hidden md:table-cell">
                    {age ? <span title={`Última venta: ${formatDate(r.last_sale_at)}`}><Badge tone={age.tone}>{age.label}</Badge></span> : <span className="text-muted">—</span>}
                  </Td>
                  {finance && <Td className="num hidden text-right md:table-cell">{r.cost ? formatHNL(toCents(r.cost) * r.on_hand) : <span className="text-warn">Sin costo</span>}</Td>}
                  {canAdjust && (
                    <Td className="text-right">
                      <Link href={`?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), filtro: filter, ajustar: r.variant_id })}`} className="text-sm text-olive hover:underline">Ajustar</Link>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} params={{ q: sp.q, filtro: filter }} />
    </>
  );
}
