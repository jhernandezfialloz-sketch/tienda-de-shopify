"use client";

import { useActionState, useState } from "react";
import { adjustStockAction } from "@/server/actions/inventory";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/form";

const TYPES = [
  ["AJUSTE", "Ajuste (+/−)"],
  ["CORRECCION", "Corrección por conteo físico"],
  ["DANO", "Producto dañado"],
  ["PERDIDA", "Pérdida / robo"],
  ["DEVOLUCION", "Devolución de cliente (sin venta registrada)"],
  ["INICIAL", "Inventario inicial"],
] as const;

export function AdjustForm({ variantId, sku, onHand }: { variantId: string; sku: string; onHand: number }) {
  const [state, action, pending] = useActionState(adjustStockAction, null);
  const [type, setType] = useState<string>("AJUSTE");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_2fr_auto] lg:items-end">
      <input type="hidden" name="variantId" value={variantId} />
      <div className="sm:col-span-2 lg:col-span-5">
        <p className="text-sm">
          Ajustando <span className="num font-semibold">{sku}</span> · stock actual <span className="num font-semibold">{onHand}</span>
        </p>
      </div>
      <Field label="Tipo">
        <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      {type === "AJUSTE" && (
        <Field label="Dirección">
          <Select name="direction" defaultValue="in">
            <option value="in">Entrada (+)</option>
            <option value="out">Salida (−)</option>
          </Select>
        </Field>
      )}
      <Field label={type === "CORRECCION" ? "Cantidad contada" : "Unidades"}>
        <Input name="quantity" type="number" min={0} required className="num" />
      </Field>
      <Field label="Razón (obligatoria)">
        <Input name="reason" required minLength={3} placeholder="Ej.: conteo semanal, mancha en tela…" />
      </Field>
      <Button disabled={pending}>{pending ? "Guardando…" : "Registrar"}</Button>
      <div className="sm:col-span-2 lg:col-span-5">
        {state && !state.ok && <FormError message={state.error} />}
        {state?.ok && <p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">Registrado. {state.message}</p>}
      </div>
    </form>
  );
}
