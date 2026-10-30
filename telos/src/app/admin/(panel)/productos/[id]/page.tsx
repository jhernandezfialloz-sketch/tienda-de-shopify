import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatHNL, toCents } from "@/lib/money";
import { unitMargin } from "@/lib/metrics";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { getProduct } from "@/server/services/products";
import { MOVEMENT_LABELS } from "@/server/services/inventory";
import { PageHeader, Section } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { ProductForm } from "@/components/admin/product-form";
import { ImageManager } from "@/components/admin/image-manager";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("products:read");
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const [categories, movements, sold] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, code: true } }),
    db.inventoryMovement.findMany({
      where: { variant: { productId: product.id } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { variant: { select: { sku: true } }, user: { select: { name: true } } },
    }),
    db.saleItem.groupBy({
      by: ["variantId"],
      where: { variant: { productId: product.id }, sale: { status: { in: ["CONFIRMADA", "ENTREGADA"] } } },
      _sum: { quantity: true, lineTotal: true },
    }),
  ]);
  const finance = can(user.role, "finance:read");
  const editable = can(user.role, "products:write");
  const soldBy = new Map(sold.map((s) => [s.variantId, s._sum]));

  return (
    <>
      <PageHeader eyebrow={`${product.category.name} · ${product.code}`} title={product.name}>
        {product.internalNotes && <p className="mt-2 rounded bg-warn-soft px-2 py-1 text-sm text-warn">{product.internalNotes}</p>}
      </PageHeader>

      <div className="flex flex-col gap-6">
        <Section title="Rentabilidad por variante">
          <Table>
            <thead>
              <tr>
                <Th>SKU</Th><Th>Color / talla</Th><Th className="text-right">Precio</Th>
                {finance && <><Th className="text-right">Costo</Th><Th className="text-right">Margen</Th></>}
                <Th className="text-right">Vendidas</Th>{finance && <Th className="text-right">Ingresos</Th>}<Th className="text-right">Stock</Th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => {
                const m = unitMargin(v.price === null ? null : toCents(v.price), v.cost === null ? null : toCents(v.cost));
                const s = soldBy.get(v.id);
                return (
                  <tr key={v.id} className={v.active ? "" : "opacity-50"}>
                    <Td className="num"><Link className="hover:underline" href={`/admin/movimientos?variante=${v.id}`}>{v.sku}</Link></Td>
                    <Td>{[v.color, v.size].filter(Boolean).join(" / ") || "—"}</Td>
                    <Td className="num text-right">{v.price ? formatHNL(v.price) : <span className="text-warn">Pendiente</span>}</Td>
                    {finance && (
                      <>
                        <Td className="num text-right">{v.cost ? formatHNL(v.cost) : <span className="text-warn">Pendiente</span>}</Td>
                        <Td className="num text-right">{m ? `${formatHNL(m.amount)} · ${m.percent}%` : "—"}</Td>
                      </>
                    )}
                    <Td className="num text-right">{s?.quantity ?? 0}</Td>
                    {finance && <Td className="num text-right">{formatHNL(s?.lineTotal ?? 0)}</Td>}
                    <Td className="num text-right">{v.inventory?.onHand ?? 0}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Section>

        <Section title="Fotos">
          <ImageManager productId={product.id} images={product.images} canEdit={editable} />
        </Section>

        {editable && (
          <Section title="Editar producto">
            <ProductForm
              productId={product.id}
              categories={categories}
              canAdjustStock={can(user.role, "inventory:adjust")}
              initial={{
                name: product.name,
                categoryId: product.categoryId,
                brand: product.brand ?? "",
                description: product.description ?? "",
                material: product.material ?? "",
                status: product.status,
                minimumStock: String(product.minimumStock),
                internalNotes: product.internalNotes ?? "",
                variants: product.variants.map((v) => ({
                  id: v.id,
                  sku: v.sku,
                  color: v.color ?? "",
                  size: v.size ?? "",
                  barcode: v.barcode ?? "",
                  price: v.price?.toFixed(2) ?? "",
                  cost: v.cost?.toFixed(2) ?? "",
                  minimumStock: v.minimumStock?.toString() ?? "",
                  initialStock: "",
                  active: v.active,
                  onHand: v.inventory?.onHand ?? 0,
                })),
              }}
            />
          </Section>
        )}

        <Section title="Últimos movimientos" actions={<Link href="/admin/movimientos" className="text-xs text-muted hover:text-ink">Ver todos</Link>}>
          {movements.length === 0 ? (
            <p className="text-sm text-muted">Sin movimientos.</p>
          ) : (
            <ul className="divide-y divide-line/70 text-sm">
              {movements.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span><span className="num">{m.variant.sku}</span> · {MOVEMENT_LABELS[m.type]} {m.reason && <span className="text-muted">— {m.reason}</span>}</span>
                  <span className="num text-muted">{m.quantityBefore} → {m.quantityAfter} · {formatDateTime(m.createdAt)} · {m.user?.name ?? "Sistema"}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
