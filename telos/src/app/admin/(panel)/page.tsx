import Link from "next/link";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { dashboardData } from "@/server/services/dashboard";
import { inventorySummary } from "@/server/services/inventory-queries";
import { averageOrderValue, grossMargin } from "@/lib/metrics";
import { formatHNL, toCents } from "@/lib/money";
import { PageHeader, Section, Stat } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { ActivityList } from "@/components/admin/activity-list";

export const metadata = { title: "Dashboard" };

const NO_DATA = <span className="text-sm font-normal text-muted">No hay suficientes datos</span>;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denegado?: string }> }) {
  const user = await requireUser();
  const { denegado } = await searchParams;
  const finance = can(user.role, "finance:read");
  const [{ day, week, month, recentActivity, lowStock }, inv] = await Promise.all([dashboardData(), inventorySummary()]);

  const monthMargin = month.cogs === null ? null : grossMargin(month.revenue, month.cogs);
  const weekAov = averageOrderValue(week.revenue, week.orders);

  return (
    <>
      <PageHeader
        eyebrow="Hoy en Telos"
        title={`Hola, ${user.name.split(" ")[0]}`}
        actions={
          <>
            {can(user.role, "sales:write") && <LinkButton href="/admin/ventas/nueva">Nueva venta</LinkButton>}
            {can(user.role, "purchases:write") && <LinkButton variant="secondary" href="/admin/compras/nueva">Nueva compra</LinkButton>}
          </>
        }
      />
      {denegado && (
        <p className="mb-4 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">Tu rol no tiene acceso a esa sección ({denegado}).</p>
      )}

      {/* Fila 1: ingresos, utilidad, unidades, inventario */}
      <div className="mb-6 grid grid-cols-2 divide-line rounded-lg border border-line bg-surface lg:grid-cols-4 lg:divide-x">
        <Stat label="Ingresos hoy" value={finance ? formatHNL(day.revenue) : "—"} note={`${day.orders} venta(s) · semana ${finance ? formatHNL(week.revenue) : "—"}`} />
        <Stat
          label="Utilidad bruta 30 d"
          value={!finance ? "—" : month.cogs === null ? NO_DATA : formatHNL(month.revenue - month.cogs)}
          note={monthMargin?.ok ? `Margen ${monthMargin.value}%` : month.cogs === null && month.orders > 0 ? "Hay ventas sin costo registrado" : undefined}
        />
        <Stat label="Unidades vendidas 30 d" value={month.units} note={`Hoy ${day.units} · semana ${week.units}`} />
        <Stat
          label="Inventario"
          value={`${inv.units} u.`}
          note={finance ? `A costo ${formatHNL(toCents(inv.value_at_cost))}` : undefined}
        />
      </div>

      {finance && (
        <div className="mb-6 grid grid-cols-2 rounded-lg border border-line bg-surface sm:grid-cols-4">
          <Stat label="Ventas 30 d" value={formatHNL(month.revenue)} note={`${month.orders} pedidos · ${month.customers} clientes`} />
          <Stat label="Ticket promedio 7 d" value={weekAov.ok ? formatHNL(weekAov.value) : NO_DATA} />
          <Stat label="Valor a precio" value={formatHNL(toCents(inv.value_at_price))} note={`Margen potencial ${formatHNL(toCents(inv.value_at_price) - toCents(inv.value_at_cost))}`} />
          <Stat
            label="Datos pendientes"
            value={inv.variants_missing_price + inv.variants_missing_cost}
            note={`${inv.variants_missing_price} sin precio · ${inv.variants_missing_cost} con stock sin costo`}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Stock bajo"
          actions={<Link href="/admin/inventario?filtro=low" className="text-xs text-muted hover:text-ink">Ver todo</Link>}
        >
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">
              Ningún producto está por debajo de su stock mínimo. {inv.out_of_stock > 0 && `${inv.out_of_stock} variante(s) agotada(s).`}
            </p>
          ) : (
            <ul className="divide-y divide-line/70 text-sm">
              {lowStock.map((r) => (
                <li key={r.variant_id} className="flex items-center justify-between py-2">
                  <span>
                    <span className="num">{r.sku}</span> <span className="text-muted">{r.product_name}</span>
                  </span>
                  <span className={`num ${r.on_hand === 0 ? "text-danger" : "text-warn"}`}>
                    {r.on_hand} / mín {r.minimum}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Actividad reciente" actions={<Link href="/admin/actividad" className="text-xs text-muted hover:text-ink">Ver todo</Link>}>
          <ActivityList entries={recentActivity} />
        </Section>
      </div>
      <p className="mt-6 text-xs text-muted">
        Gráfica de ventas, top productos y ventas por canal llegan en la Fase 2 (Control), calculados solo con datos reales.
      </p>
    </>
  );
}
