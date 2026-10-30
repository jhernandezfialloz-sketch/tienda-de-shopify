"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProductAction } from "@/server/actions/products";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";

export interface VariantDraft {
  id?: string;
  sku: string;
  color: string;
  size: string;
  barcode: string;
  price: string;
  cost: string;
  minimumStock: string;
  initialStock: string;
  active: boolean;
  onHand?: number;
}

export interface ProductDraft {
  name: string;
  categoryId: string;
  brand: string;
  description: string;
  material: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  minimumStock: string;
  internalNotes: string;
  variants: VariantDraft[];
}

const emptyVariant = (): VariantDraft => ({ sku: "", color: "", size: "", barcode: "", price: "", cost: "", minimumStock: "", initialStock: "", active: true });

export function ProductForm({
  productId,
  initial,
  categories,
  canAdjustStock,
}: {
  productId: string | null;
  initial?: ProductDraft;
  categories: { id: string; name: string; code: string }[];
  canAdjustStock: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(
    initial ?? { name: "", categoryId: "", brand: "", description: "", material: "", status: "DRAFT", minimumStock: "0", internalNotes: "", variants: [emptyVariant()] },
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setVariant = (i: number, patch: Partial<VariantDraft>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  /** Atajo: crear variantes para varias tallas del mismo color. */
  const addSizes = () => {
    const color = draft.variants[draft.variants.length - 1]?.color ?? "";
    const sizes = prompt("Tallas separadas por coma (ej. S, M, L, XL)");
    if (!sizes) return;
    const fresh = sizes.split(",").map((s) => s.trim()).filter(Boolean).map((size) => ({ ...emptyVariant(), color, size }));
    setDraft((d) => ({ ...d, variants: [...d.variants.filter((v) => v.id || v.color || v.size || v.price), ...fresh] }));
  };

  const submit = () => {
    setError(null);
    setSaved(false);
    start(async () => {
      const payload = {
        ...draft,
        variants: draft.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          color: v.color,
          size: v.size,
          barcode: v.barcode,
          price: v.price,
          cost: v.cost,
          minimumStock: v.minimumStock,
          initialStock: v.id ? undefined : v.initialStock,
          active: v.active,
        })),
      };
      const res = await saveProductAction(productId, payload);
      if (!res.ok) return setError(res.error);
      if (!productId && res.data) router.push(`/admin/productos/${res.data.id}`);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      <FormError message={error} />
      {saved && <p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">Cambios guardados.</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nombre comercial" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} required placeholder="Camiseta AllSaints Spitalfields" />
        </Field>
        <Field label="Categoría" hint={productId ? "El código del producto no cambia." : "Define el prefijo del código (TLS-CMT-…)."}>
          <Select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
            <option value="">Selecciona…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </Select>
        </Field>
        <Field label="Marca">
          <Input value={draft.brand} onChange={(e) => set("brand", e.target.value)} />
        </Field>
        <Field label="Material">
          <Input value={draft.material} onChange={(e) => set("material", e.target.value)} placeholder="100% algodón" />
        </Field>
        <Field label="Estado" hint="Borrador: no aparece en la web.">
          <Select value={draft.status} onChange={(e) => set("status", e.target.value as ProductDraft["status"])}>
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activo</option>
            <option value="ARCHIVED">Archivado</option>
          </Select>
        </Field>
        <Field label="Descripción" className="sm:col-span-2 lg:col-span-3">
          <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </Field>
        <Field label="Stock mínimo (por variante)" hint="Alerta cuando stock ≤ mínimo.">
          <Input type="number" min={0} value={draft.minimumStock} onChange={(e) => set("minimumStock", e.target.value)} />
        </Field>
        <Field label="Notas internas" className="sm:col-span-2" hint="Ej.: PENDIENTE DE CONFIRMAR talla y costo.">
          <Input value={draft.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} />
        </Field>
      </div>

      <fieldset className="rounded-lg border border-line bg-surface">
        <legend className="mx-3 px-1 text-sm font-semibold">Variantes</legend>
        <div className="flex flex-col divide-y divide-line">
          {draft.variants.map((v, i) => (
            <div key={v.id ?? `new-${i}`} className={`grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 lg:grid-cols-8 ${v.active ? "" : "opacity-50"}`}>
              <Field label="Color"><Input value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} /></Field>
              <Field label="Talla"><Input value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} /></Field>
              <Field label="SKU" className="col-span-2">
                <Input className="num uppercase" value={v.sku} placeholder="Automático" onChange={(e) => setVariant(i, { sku: e.target.value })} />
              </Field>
              <Field label="Precio L"><Input inputMode="decimal" className="num" value={v.price} placeholder="Pendiente" onChange={(e) => setVariant(i, { price: e.target.value })} /></Field>
              <Field label="Costo L"><Input inputMode="decimal" className="num" value={v.cost} placeholder="Pendiente" onChange={(e) => setVariant(i, { cost: e.target.value })} /></Field>
              {v.id ? (
                <Field label="Stock" hint="Se cambia en Inventario">
                  <span className="num flex h-9 items-center">{v.onHand ?? 0}</span>
                </Field>
              ) : (
                <Field label="Stock inicial">
                  <Input type="number" min={0} className="num" disabled={!canAdjustStock} value={v.initialStock} onChange={(e) => setVariant(i, { initialStock: e.target.value })} />
                </Field>
              )}
              <div className="flex items-end gap-2">
                {v.id ? (
                  <Button type="button" variant="ghost" onClick={() => setVariant(i, { active: !v.active })}>{v.active ? "Desactivar" : "Activar"}</Button>
                ) : (
                  draft.variants.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => setDraft((d) => ({ ...d, variants: d.variants.filter((_, j) => j !== i) }))}>Quitar</Button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line p-3">
          <Button type="button" variant="secondary" onClick={() => setDraft((d) => ({ ...d, variants: [...d.variants, emptyVariant()] }))}>+ Variante</Button>
          <Button type="button" variant="ghost" onClick={addSizes}>+ Varias tallas</Button>
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : productId ? "Guardar cambios" : "Crear producto"}</Button>
      </div>
    </form>
  );
}
