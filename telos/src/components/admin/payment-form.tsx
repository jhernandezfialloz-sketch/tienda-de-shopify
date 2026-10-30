"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/server/actions/run";
import { Button } from "@/components/ui/button";
import { FormError, Input, Select } from "@/components/ui/form";

export function PaymentForm({ action, balance }: { action: (s: unknown, f: FormData) => Promise<ActionResult>; balance: string }) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form action={run} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input name="amount" defaultValue={balance} inputMode="decimal" className="num" aria-label="Monto" required />
        <Select name="method" aria-label="Método">
          {["Efectivo", "Transferencia", "Tarjeta", "Contra entrega", "Otro"].map((m) => <option key={m}>{m}</option>)}
        </Select>
      </div>
      <Input name="reference" placeholder="Referencia (opcional)" />
      <Button variant="secondary" disabled={pending}>Registrar pago</Button>
      {state && !state.ok && <FormError message={state.error} />}
    </form>
  );
}
