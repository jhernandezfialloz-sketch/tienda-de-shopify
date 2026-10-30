import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface InventoryRow {
  variant_id: string;
  sku: string;
  product_id: string;
  product_code: string;
  product_name: string;
  color: string | null;
  size: string | null;
  price: string | null;
  cost: string | null;
  on_hand: number;
  reserved: number;
  minimum: number;
  last_sale_at: Date | null;
  last_in_at: Date | null;
}

/** Inventario por variante con stock mínimo efectivo y última venta. Paginado en SQL. */
export async function listInventory(params: { q?: string; filter?: "low" | "out" | "all"; page?: number; pageSize?: number }) {
  const pageSize = Math.min(params.pageSize ?? 50, 200);
  const page = Math.max(params.page ?? 1, 1);
  const q = params.q?.trim() ? `%${params.q.trim()}%` : null;
  const conditions: Prisma.Sql[] = [Prisma.sql`v.active = true`, Prisma.sql`p.status <> 'ARCHIVED'`];
  if (q) conditions.push(Prisma.sql`(v.sku ILIKE ${q} OR p.name ILIKE ${q} OR p.code ILIKE ${q} OR v.barcode = ${params.q?.trim()})`);
  if (params.filter === "out") conditions.push(Prisma.sql`COALESCE(i.on_hand, 0) = 0`);
  if (params.filter === "low") conditions.push(Prisma.sql`COALESCE(v.minimum_stock, p.minimum_stock) > 0 AND COALESCE(i.on_hand, 0) <= COALESCE(v.minimum_stock, p.minimum_stock)`);
  const where = Prisma.join(conditions, " AND ");

  const rows = await db.$queryRaw<InventoryRow[]>`
    SELECT v.id AS variant_id, v.sku, p.id AS product_id, p.code AS product_code, p.name AS product_name,
           v.color, v.size, v.price::text AS price, v.cost::text AS cost,
           COALESCE(i.on_hand, 0)::int AS on_hand, COALESCE(i.reserved, 0)::int AS reserved,
           COALESCE(v.minimum_stock, p.minimum_stock)::int AS minimum,
           (SELECT max(m.created_at) FROM inventory_movements m WHERE m.variant_id = v.id AND m.type = 'VENTA') AS last_sale_at,
           (SELECT max(m.created_at) FROM inventory_movements m WHERE m.variant_id = v.id AND m.quantity_change > 0) AS last_in_at
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN inventory i ON i.variant_id = v.id
    WHERE ${where}
    ORDER BY v.sku
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const countRows = await db.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM product_variants v JOIN products p ON p.id = v.product_id
    LEFT JOIN inventory i ON i.variant_id = v.id WHERE ${where}`;
  return { rows, total: countRows[0]?.n ?? 0, page, pageSize };
}

export interface InventorySummary {
  units: number;
  value_at_cost: string;
  value_at_price: string;
  variants_missing_cost: number;
  variants_missing_price: number;
  out_of_stock: number;
  low_stock: number;
}

/** Valor del inventario: Σ stock × costo y Σ stock × precio (solo variantes con dato). */
export async function inventorySummary(): Promise<InventorySummary> {
  const rows = await db.$queryRaw<InventorySummary[]>`
    SELECT COALESCE(sum(i.on_hand), 0)::int AS units,
           COALESCE(sum(i.on_hand * v.cost), 0)::text AS value_at_cost,
           COALESCE(sum(i.on_hand * v.price), 0)::text AS value_at_price,
           count(*) FILTER (WHERE v.cost IS NULL AND COALESCE(i.on_hand,0) > 0)::int AS variants_missing_cost,
           count(*) FILTER (WHERE v.price IS NULL)::int AS variants_missing_price,
           count(*) FILTER (WHERE COALESCE(i.on_hand, 0) = 0)::int AS out_of_stock,
           count(*) FILTER (WHERE COALESCE(v.minimum_stock, p.minimum_stock) > 0
                            AND COALESCE(i.on_hand, 0) <= COALESCE(v.minimum_stock, p.minimum_stock)
                            AND COALESCE(i.on_hand, 0) > 0)::int AS low_stock
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN inventory i ON i.variant_id = v.id
    WHERE v.active = true AND p.status <> 'ARCHIVED'`;
  return rows[0]!;
}

export async function listMovements(params: { variantId?: string; type?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(params.pageSize ?? 50, 200);
  const page = Math.max(params.page ?? 1, 1);
  const where: Prisma.InventoryMovementWhereInput = {
    ...(params.variantId ? { variantId: params.variantId } : {}),
    ...(params.type ? { type: params.type as Prisma.InventoryMovementWhereInput["type"] } : {}),
  };
  const [total, items] = await Promise.all([
    db.inventoryMovement.count({ where }),
    db.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { variant: { select: { sku: true, product: { select: { name: true } } } }, user: { select: { name: true } } },
    }),
  ]);
  return { total, page, pageSize, items };
}
