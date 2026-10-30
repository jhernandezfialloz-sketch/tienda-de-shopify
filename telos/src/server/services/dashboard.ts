import { db } from "@/lib/db";
import { daysAgo, startOfDayInTz } from "@/lib/dates";
import { toCents } from "@/lib/money";

/** KPIs de ventas en un rango (solo ventas confirmadas/entregadas cuentan como ingreso). */
export async function salesKpis(from: Date, to = new Date()) {
  const rows = await db.$queryRaw<
    { orders: number; revenue: string; cogs: string | null; missing_cost: number; units: number; customers: number }[]
  >`
    SELECT count(*)::int AS orders,
           COALESCE(sum(s.total), 0)::text AS revenue,
           COALESCE(sum(s.cost_total), 0)::text AS cogs,
           count(*) FILTER (WHERE s.cost_total IS NULL)::int AS missing_cost,
           COALESCE((SELECT sum(si.quantity) FROM sale_items si JOIN sales s2 ON s2.id = si.sale_id
                     WHERE s2.status IN ('CONFIRMADA','ENTREGADA') AND s2.sold_at >= ${from} AND s2.sold_at < ${to}), 0)::int AS units,
           count(DISTINCT s.customer_id)::int AS customers
    FROM sales s
    WHERE s.status IN ('CONFIRMADA','ENTREGADA') AND s.sold_at >= ${from} AND s.sold_at < ${to}`;
  const r = rows[0]!;
  return {
    orders: r.orders,
    revenue: toCents(r.revenue),
    // Si alguna venta no tiene costo, el COGS del periodo es incompleto: no se presenta como exacto.
    cogs: r.missing_cost > 0 ? null : toCents(r.cogs ?? "0"),
    units: r.units,
    customers: r.customers,
  };
}

export async function dashboardData() {
  const today = startOfDayInTz();
  const [day, week, month, recentActivity, lowStock] = await Promise.all([
    salesKpis(today),
    salesKpis(daysAgo(6)),
    salesKpis(daysAgo(29)),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: { select: { name: true } } } }),
    db.$queryRaw<{ sku: string; product_name: string; on_hand: number; minimum: number; variant_id: string }[]>`
      SELECT v.id AS variant_id, v.sku, p.name AS product_name, COALESCE(i.on_hand,0)::int AS on_hand,
             COALESCE(v.minimum_stock, p.minimum_stock)::int AS minimum
      FROM product_variants v JOIN products p ON p.id = v.product_id LEFT JOIN inventory i ON i.variant_id = v.id
      WHERE v.active AND p.status <> 'ARCHIVED' AND COALESCE(v.minimum_stock, p.minimum_stock) > 0
        AND COALESCE(i.on_hand,0) <= COALESCE(v.minimum_stock, p.minimum_stock)
      ORDER BY COALESCE(i.on_hand,0) ASC LIMIT 8`,
  ]);
  return { day, week, month, recentActivity, lowStock };
}
