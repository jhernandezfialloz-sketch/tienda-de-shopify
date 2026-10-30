import { db } from "@/lib/db";

export interface SearchHit {
  kind: "producto" | "variante" | "venta" | "compra" | "cliente" | "proveedor";
  label: string;
  sublabel?: string;
  href: string;
}

/** Búsqueda global (Cmd+K): productos, SKU, ventas, compras, clientes, proveedores. */
export async function globalSearch(q: string): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const ci = { contains: term, mode: "insensitive" as const };
  const [products, variants, sales, purchases, customers, suppliers] = await Promise.all([
    db.product.findMany({ where: { OR: [{ name: ci }, { code: ci }] }, take: 5, select: { id: true, name: true, code: true } }),
    db.productVariant.findMany({ where: { OR: [{ sku: ci }, { barcode: term }] }, take: 5, select: { sku: true, productId: true, product: { select: { name: true } } } }),
    db.sale.findMany({ where: { OR: [{ code: ci }, { customer: { name: ci } }] }, take: 5, select: { id: true, code: true, customer: { select: { name: true } } } }),
    db.purchase.findMany({ where: { code: ci }, take: 5, select: { id: true, code: true } }),
    db.customer.findMany({ where: { OR: [{ name: ci }, { phone: ci }] }, take: 5, select: { id: true, name: true, phone: true } }),
    db.supplier.findMany({ where: { OR: [{ name: ci }, { company: ci }] }, take: 5, select: { id: true, name: true } }),
  ]);
  return [
    ...variants.map((v) => ({ kind: "variante" as const, label: v.sku, sublabel: v.product.name, href: `/admin/productos/${v.productId}` })),
    ...products.map((p) => ({ kind: "producto" as const, label: p.code, sublabel: p.name, href: `/admin/productos/${p.id}` })),
    ...sales.map((s) => ({ kind: "venta" as const, label: s.code, sublabel: s.customer?.name, href: `/admin/ventas/${s.id}` })),
    ...purchases.map((p) => ({ kind: "compra" as const, label: p.code, href: `/admin/compras/${p.id}` })),
    ...customers.map((c) => ({ kind: "cliente" as const, label: c.name, sublabel: c.phone ?? undefined, href: `/admin/clientes?q=${encodeURIComponent(c.name)}` })),
    ...suppliers.map((s) => ({ kind: "proveedor" as const, label: s.name, href: `/admin/proveedores?q=${encodeURIComponent(s.name)}` })),
  ];
}
