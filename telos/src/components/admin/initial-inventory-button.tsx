"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadInitialInventoryAction } from "@/server/actions/setup";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";

/** Carga el inventario inicial por tandas, mostrando el avance. */
export function InitialInventoryButton() {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setProgress("Preparando…");
    for (let guard = 0; guard < 20; guard++) {
      const res = await loadInitialInventoryAction();
      if (!res.ok) {
        setError(res.error);
        setProgress(null);
        return;
      }
      const { remaining, total } = res.data ?? { remaining: 0, total: 0 };
      setProgress(`Cargando productos y fotos… ${total - remaining} de ${total}`);
      if (remaining === 0) return router.push("/admin/productos");
    }
    setError("La carga no terminó. Vuelve a pulsar el botón: continúa donde quedó.");
    setProgress(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={run} disabled={!!progress}>{progress ?? "Cargar inventario inicial"}</Button>
      <FormError message={error} />
    </div>
  );
}
