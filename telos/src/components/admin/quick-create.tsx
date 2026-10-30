"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionResult } from "@/server/actions/run";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

/** Formulario compacto de alta (clientes, proveedores). */
export function QuickCreate({
  action,
  fields,
  submitLabel,
}: {
  action: (s: unknown, f: FormData) => Promise<ActionResult>;
  fields: { name: string; label: string; type?: string; required?: boolean }[];
  submitLabel: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={run} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      {fields.map((f) => (
        <Field key={f.name} label={f.label}>
          <Input name={f.name} type={f.type ?? "text"} required={f.required} />
        </Field>
      ))}
      <Button disabled={pending}>{submitLabel}</Button>
      <div className="sm:col-span-2 lg:col-span-4">
        {state && !state.ok && <FormError message={state.error} />}
        {state?.ok && <p className="text-sm text-ok">{state.message}</p>}
      </div>
    </form>
  );
}
