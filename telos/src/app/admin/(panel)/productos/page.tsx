import Link from "next/link";
import { db } from "@/lib/db";
import { formatHNL } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { listProducts } from "@/server/services/products";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";

export const metadata = { title: "Productos" };

const STATUS = { DRAFT: ["Borrador", "neutral"], ACTIVE: ["Activo", "ok"], ARCHIVED: ["Archivado", "danger"] } as const;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("products:read");
  const sp = await searchParams;
  const [categories, { items, total, page, pageSize }] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    listProducts({ q: sp.q, categoryId: sp.categoria, status: sp.estado, page: Number(sp.page) || 1 }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Operar" title="Productos" actions={can(user.role, "products:write") && <LinkButton href="/admin/productos/nuevo">Nuevo producto</LinkButton>} />
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_160px_auto]">
        <Input name="q" defaultValue={sp.q} placeholder="Buscar nombre, código, SKU o marca" aria-label="Buscar" />
        <Select name="categoria" defaultValue={sp.categoria ?? ""} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="estado" defaultValue={sp.estado ?? ""} aria-label="Estado">
          <option value="">Activos y borradores</option>
          <option value="ACTIVE">Activos</option>
          <option value="DRAFT">Borradores</option>
          <option value="ARCHIVED">Archivados</option>
        </Select>
        <button className="h-9 rounded-md border border-line-strong px-3 text-sm hover:bg-surface">Filtrar</button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title={sp.q ? "Ningún producto coincide con la búsqueda." : "Todavía no hay productos."}
          body="Crea tu primer producto con sus variantes (color/talla). El SKU se genera automáticamente."
          action={can(user.role, "products:write") && <LinkButton href="/admin/productos/nuevo">Crear primer producto</LinkButton>}
        />
      ) : (
        <Table>
          <thead>
            <tr><Th>Código</Th><Th>Producto</Th><Th className="hidden sm:table-cell">Categoría</Th><Th className="text-right">Precio</Th><Th className="text-right">Stock</Th><Th>Estado</Th></tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const stock = p.variants.reduce((s, v) => s + (v.inventory?.onHand ?? 0), 0);
              const prices = p.variants.map((v) => v.price).filter((x) => x !== null);
              const missing = p.variants.some((v) => v.price === null || v.cost === null);
              const [label, tone] = STATUS[p.status];
              return (
                <tr key={p.id} className="hover:bg-paper/60">
                  <Td className="num whitespace-nowrap"><Link href={`/admin/productos/${p.id}`} className="hover:underline">{p.code}</Link></Td>
                  <Td>
                    <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3">
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                      ) : (
                        <span className="h-10 w-10 rounded bg-line/60" aria-hidden />
                      )}
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-xs text-muted">{p.brand ?? "Marca sin confirmar"} · {p.variants.length} variante(s)</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="hidden sm:table-cell">{p.category.name}</Td>
                  <Td className="num text-right whitespace-nowrap">{prices.length ? formatHNL(prices[0]!) : <span className="text-muted">Pendiente</span>}</Td>
                  <Td className={`num text-right ${stock === 0 ? "text-danger" : ""}`}>{stock}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={tone}>{label}</Badge>
                      {missing && <Badge tone="warn">Datos pendientes</Badge>}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} params={{ q: sp.q, categoria: sp.categoria, estado: sp.estado }} />
    </>
  );
}
