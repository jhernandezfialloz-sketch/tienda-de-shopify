"use client";

import { useActionState } from "react";
import { loadInitialInventoryAction } from "@/server/actions/setup";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";

export function InitialInventoryButton() {
  const [state, run, pending] = useActionState(loadInitialInventoryAction, null);
  return (
    <form action={run} className="flex flex-wrap items-center gap-3">
      <Button disabled={pending}>{pending ? "Cargando productos y fotos…" : "Cargar inventario inicial"}</Button>
      {state && !state.ok && <FormError message={state.error} />}
    </form>
  );
}
