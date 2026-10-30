"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state?.error} />
      <Field label="Correo">
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Contraseña">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
      <Link href="/admin/recuperar" className="text-sm text-muted hover:text-ink">¿Olvidaste tu contraseña?</Link>
    </form>
  );
}
