"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createPurchaseAction } from "@/server/actions/purchases";
import { formatHNL, toCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { VariantPicker, type VariantOption } from "./variant-picker";

interface Line { variant: VariantOption; quantity: string; unitCost: string }
const c = (v: string) => { try { return toCents(v || "0"); } catch { return 0; } };

export function PurchaseForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [f, setF] = useState({ supplierId: "", shippingCost: "", taxes: "", otherCosts: "", paymentMethod: "Transferencia", notes: "", status: "ORDENADA" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const totals = useMemo(() => {
    const merch = lines.reduce((s, l) => s + c(l.unitCost) * (Number(l.quantity) || 0), 0);
    const extras = c(f.shippingCost) + c(f.taxes) + c(f.otherCosts);
    const units = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    return { merch, extras, total: merch + extras, units };
  }, [lines, f]);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createPurchaseAction({ ...f, items: lines.map((l) => ({ variantId: l.variant.id, quantity: l.quantity, unitCost: l.unitCost })) });
          if (!res.ok) return setError(res.error);
          router.push(`/admin/compras/${res.data?.id}`);
        });
      }}
      className="flex flex-col gap-6"
    >
      <FormError message={error} />
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <VariantPicker exclude={lines.map((l) => l.variant.id)} onPick={(v) => setLines((ls) => [...ls, { variant: v, quantity: "1", unitCost: v.cost ?? "" }])} />
        {lines.length === 0 ? <p className="py-4 text-sm text-muted">Agrega los productos comprados. Si el producto no existe, créalo primero en Productos.</p> : (
          <ul className="divide-y divide-line">
            {lines.map((l, i) => (
              <li key={l.variant.id} className="grid grid-cols-2 items-end gap-3 py-3 sm:grid-cols-[2fr_90px_130px_120px_auto]">
                <div className="col-span-2 sm:col-span-1">
                  <p className="num text-sm font-medium">{l.variant.sku}</p>
                  <p className="text-xs text-muted">{l.variant.name}</p>
                </div>
                <Field label="Cant."><Input type="number" min={1} className="num" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></Field>
                <Field label="Costo unit. L"><Input inputMode="decimal" className="num" value={l.unitCost} required onChange={(e) => update(i, { unitCost: e.target.value })} /></Field>
                <p className="num pb-2 text-right text-sm">{formatHNL(c(l.unitCost) * (Number(l.quantity) || 0))}</p>
                <Button type="button" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Quitar</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Proveedor">
          <Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Estado inicial">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="BORRADOR">Borrador</option>
            <option value="ORDENADA">Ordenada</option>
          </Select>
        </Field>
        <Field label="Método de pago"><Input value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })} /></Field>
        <div />
        <Field label="Transporte L"><Input inputMode="decimal" className="num" value={f.shippingCost} onChange={(e) => setF({ ...f, shippingCost: e.target.value })} /></Field>
        <Field label="Impuestos L"><Input inputMode="decimal" className="num" value={f.taxes} onChange={(e) => setF({ ...f, taxes: e.target.value })} /></Field>
        <Field label="Otros costos L"><Input inputMode="decimal" className="num" value={f.otherCosts} onChange={(e) => setF({ ...f, otherCosts: e.target.value })} /></Field>
        <Field label="Observaciones" className="sm:col-span-2 lg:col-span-4"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Mercancía {formatHNL(totals.merch)} + extras {formatHNL(totals.extras)}
          {totals.units > 0 && <> · costo real promedio <span className="num text-ink">{formatHNL(Math.round(totals.total / totals.units))}</span>/u.</>}
          <br />El inventario se actualiza cuando marques la compra como <strong>recibida</strong>.
        </p>
        <div className="flex items-center gap-4">
          <p className="num text-2xl font-semibold">{formatHNL(totals.total)}</p>
          <Button disabled={pending || lines.length === 0}>{pending ? "Guardando…" : "Registrar compra"}</Button>
        </div>
      </div>
    </form>
  );
}
