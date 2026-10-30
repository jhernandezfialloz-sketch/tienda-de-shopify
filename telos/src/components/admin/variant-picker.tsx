"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/form";

export interface VariantOption {
  id: string;
  sku: string;
  name: string;
  color: string | null;
  size: string | null;
  price: string | null;
  cost: string | null;
  onHand: number;
}

/** Buscador de variantes por SKU, nombre o código de barras (lector = teclado + Enter). */
export function VariantPicker({ onPick, exclude }: { onPick: (v: VariantOption) => void; exclude: string[] }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<VariantOption[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/variants/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { data: VariantOption[] };
        setResults(data.data ?? []);
      } catch {
        /* cancelado */
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (v: VariantOption) => {
    onPick(v);
    setQ("");
    setResults([]);
  };

  return (
    <div className="relative">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const exact = results.find((r) => r.sku === q.trim().toUpperCase()) ?? (results.length === 1 ? results[0] : undefined);
            if (exact) pick(exact);
          }
        }}
        placeholder="Agregar producto: escribe SKU, nombre o escanea el código"
        aria-label="Buscar producto"
      />
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-lg">
          {results.map((r) => {
            const taken = exclude.includes(r.id);
            return (
              <li key={r.id}>
                <button type="button" disabled={taken} onClick={() => pick(r)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-paper disabled:opacity-40">
                  <span>
                    <span className="num font-medium">{r.sku}</span> <span className="text-muted">{r.name}</span>
                  </span>
                  <span className="num whitespace-nowrap text-xs text-muted">stock {r.onHand}{r.price ? ` · L ${r.price}` : " · sin precio"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
