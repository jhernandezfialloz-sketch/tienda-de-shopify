"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={state?.error} />
      <Field label="Nueva contraseña" hint="Mínimo 10 caracteres.">
        <Input name="password" type="password" minLength={10} required autoComplete="new-password" />
      </Field>
      <Field label="Repite la contraseña">
        <Input name="confirm" type="password" minLength={10} required autoComplete="new-password" />
      </Field>
      <Button disabled={pending}>Guardar</Button>
    </form>
  );
}
