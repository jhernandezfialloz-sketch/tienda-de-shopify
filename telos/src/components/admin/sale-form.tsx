"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createSaleAction } from "@/server/actions/sales";
import { formatHNL, toCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { VariantPicker, type VariantOption } from "./variant-picker";

const CHANNELS = [
  ["TIENDA", "Tienda"], ["INSTAGRAM", "Instagram"], ["FACEBOOK", "Facebook"], ["TIKTOK", "TikTok"], ["WHATSAPP", "WhatsApp"],
  ["REFERIDO", "Referido"], ["VENTA_DIRECTA", "Venta directa"], ["MARKETPLACE", "Marketplace"], ["WEB", "Web"], ["OTRO", "Otro"],
] as const;
const METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Contra entrega", "Otro"];

interface Line { variant: VariantOption; quantity: string; unitPrice: string; discount: string }

function safeCents(v: string) {
  try { return toCents(v || "0"); } catch { return 0; }
}

export function SaleForm({ customers }: { customers: { id: string; name: string; phone: string | null }[] }) {
  const router = useRouter();
  // Clave de idempotencia por formulario: un doble clic no crea dos ventas.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [lines, setLines] = useState<Line[]>([]);
  const [channel, setChannel] = useState("INSTAGRAM");
  const [customerMode, setCustomerMode] = useState<"none" | "existing" | "new">("none");
  const [customerId, setCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", city: "" });
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(true);
  const [markPaid, setMarkPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + safeCents(l.unitPrice) * (Number(l.quantity) || 0) - safeCents(l.discount), 0);
    return { subtotal, total: subtotal - safeCents(discount) };
  }, [lines, discount]);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = () => {
    setError(null);
    start(async () => {
      const res = await createSaleAction({
        idempotencyKey,
        channel,
        paymentMethod,
        discount,
        notes,
        confirm,
        markPaid: confirm && markPaid,
        customerId: customerMode === "existing" ? customerId : undefined,
        newCustomer: customerMode === "new" ? newCustomer : undefined,
        items: lines.map((l) => ({ variantId: l.variant.id, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })),
      });
      if (!res.ok) return setError(res.error);
      router.push(`/admin/ventas/${res.data?.id}`);
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-6">
      <FormError message={error} />
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <VariantPicker
          exclude={lines.map((l) => l.variant.id)}
          onPick={(v) => setLines((ls) => [...ls, { variant: v, quantity: "1", unitPrice: v.price ?? "", discount: "" }])}
        />
        {lines.length === 0 ? (
          <p className="py-4 text-sm text-muted">Agrega al menos un producto.</p>
        ) : (
          <ul className="divide-y divide-line">
            {lines.map((l, i) => {
              const qty = Number(l.quantity) || 0;
              const short = qty > l.variant.onHand;
              return (
                <li key={l.variant.id} className="grid grid-cols-2 items-end gap-3 py-3 sm:grid-cols-[2fr_80px_120px_110px_110px_auto]">
                  <div className="col-span-2 sm:col-span-1">
                    <p className="num text-sm font-medium">{l.variant.sku}</p>
                    <p className="text-xs text-muted">{l.variant.name} · stock {l.variant.onHand}</p>
                    {short && confirm && <p className="text-xs text-danger">No hay suficiente stock para confirmar.</p>}
                  </div>
                  <Field label="Cant."><Input type="number" min={1} className="num" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></Field>
                  <Field label="Precio L"><Input inputMode="decimal" className="num" value={l.unitPrice} placeholder="Requerido" onChange={(e) => update(i, { unitPrice: e.target.value })} /></Field>
                  <Field label="Desc. L"><Input inputMode="decimal" className="num" value={l.discount} onChange={(e) => update(i, { discount: e.target.value })} /></Field>
                  <p className="num pb-2 text-right text-sm">{formatHNL(safeCents(l.unitPrice) * qty - safeCents(l.discount))}</p>
                  <Button type="button" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Quitar</Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Canal de venta">
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Método de pago">
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Descuento general L"><Input inputMode="decimal" className="num" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
        <Field label="Cliente">
          <Select value={customerMode} onChange={(e) => setCustomerMode(e.target.value as typeof customerMode)}>
            <option value="none">Sin cliente registrado</option>
            <option value="existing">Cliente existente</option>
            <option value="new">Cliente nuevo</option>
          </Select>
        </Field>
        {customerMode === "existing" && (
          <Field label="Selecciona cliente" className="sm:col-span-2">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">—</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
            </Select>
          </Field>
        )}
        {customerMode === "new" && (
          <>
            <Field label="Nombre"><Input required value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} /></Field>
            <Field label="Teléfono / WhatsApp"><Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} /></Field>
            <Field label="Ciudad"><Input value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} /></Field>
          </>
        )}
        <Field label="Notas" className="sm:col-span-2 lg:col-span-4"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> Confirmar ahora (descuenta inventario)</label>
          <label className={`flex items-center gap-2 ${confirm ? "" : "opacity-40"}`}><input type="checkbox" disabled={!confirm} checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} /> Ya está pagada (registra el pago completo)</label>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted">Total</p>
            <p className="num text-2xl font-semibold">{formatHNL(totals.total)}</p>
          </div>
          <Button type="submit" disabled={pending || lines.length === 0}>{pending ? "Registrando…" : "Registrar venta"}</Button>
        </div>
      </div>
    </form>
  );
}
