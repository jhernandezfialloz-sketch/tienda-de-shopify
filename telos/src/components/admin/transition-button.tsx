"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/form";
import type { ActionResult } from "@/server/actions/run";

/** Botón de cambio de estado; las acciones destructivas piden razón y confirmación. */
export function TransitionButton({
  action,
  label,
  variant = "secondary",
  askReason,
  confirmText,
}: {
  action: (state: unknown, form: FormData) => Promise<ActionResult>;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  askReason?: boolean;
  confirmText?: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [open, setOpen] = useState(false);
  if (askReason && !open) return <Button type="button" variant={variant} onClick={() => setOpen(true)}>{label}</Button>;
  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      {askReason && <Input name="reason" required placeholder="Razón" className="w-48" autoFocus />}
      <Button variant={variant} disabled={pending}>{pending ? "…" : label}</Button>
      {state && !state.ok && <FormError message={state.error} />}
    </form>
  );
}
