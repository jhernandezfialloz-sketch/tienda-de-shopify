"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction } from "@/server/actions/auth";
import { AuthShell } from "@/components/admin/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export default function RecoverPage() {
  const [state, action, pending] = useActionState(requestResetAction, null);
  return (
    <AuthShell title="Recuperar contraseña">
      {state?.message ? (
        <p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">{state.message}</p>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <Field label="Correo de tu cuenta">
            <Input name="email" type="email" required autoFocus />
          </Field>
          <Button disabled={pending}>Enviar enlace</Button>
        </form>
      )}
      <Link href="/admin/login" className="mt-4 block text-sm text-muted hover:text-ink">Volver</Link>
    </AuthShell>
  );
}
