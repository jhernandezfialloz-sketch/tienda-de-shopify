"use client";

import { useActionState } from "react";
import { firstOwnerAction } from "@/server/actions/setup";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";

export function FirstOwnerForm() {
  const [state, action, pending] = useActionState(firstOwnerAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state?.error} />
      <Field label="Clave de configuración" hint="La que pusiste en SETUP_TOKEN al publicar.">
        <Input name="token" type="password" required autoComplete="off" />
      </Field>
      <Field label="Tu nombre"><Input name="name" required autoComplete="name" defaultValue={state?.name} key={`n-${state?.name}`} /></Field>
      <Field label="Correo"><Input name="email" type="email" required autoComplete="email" defaultValue={state?.email} key={`e-${state?.email}`} /></Field>
      <Field label="Contraseña" hint="Mínimo 10 caracteres."><Input name="password" type="password" minLength={10} required autoComplete="new-password" /></Field>
      <Field label="Repite la contraseña"><Input name="confirm" type="password" minLength={10} required autoComplete="new-password" /></Field>
      <Button disabled={pending}>{pending ? "Creando…" : "Crear cuenta y entrar"}</Button>
    </form>
  );
}
