"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Hit {
  kind: string;
  label: string;
  sublabel?: string;
  href: string;
}

const ACTIONS: Hit[] = [
  { kind: "acción", label: "Nueva venta", href: "/admin/ventas/nueva" },
  { kind: "acción", label: "Nueva compra", href: "/admin/compras/nueva" },
  { kind: "acción", label: "Nuevo producto", href: "/admin/productos/nuevo" },
  { kind: "acción", label: "Nuevo cliente", href: "/admin/clientes?nuevo=1" },
  { kind: "acción", label: "Consultar inventario", href: "/admin/inventario" },
  { kind: "acción", label: "Stock bajo", href: "/admin/inventario?filtro=low" },
];

/** Paleta de comandos: Cmd/Ctrl + K desde cualquier pantalla del admin. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("telos:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("telos:palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    const local = ACTIONS.filter((a) => a.label.toLowerCase().includes(term.toLowerCase()));
    if (term.length < 2) {
      setHits(local);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { data?: Hit[] };
        setHits([...(data.data ?? []), ...local]);
        setActive(0);
      } catch {
        /* búsqueda cancelada */
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = useCallback(
    (hit: Hit | undefined) => {
      if (!hit) return;
      setOpen(false);
      router.push(hit.href);
    },
    [router],
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div role="dialog" aria-label="Paleta de comandos" className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") go(hits[active]);
          }}
          placeholder="Busca SKU, producto, venta, cliente… o escribe una acción"
          className="h-12 w-full border-b border-line bg-transparent px-4 text-sm outline-none"
          aria-label="Buscar"
        />
        <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
          {hits.length === 0 && <li className="px-4 py-3 text-sm text-muted">Sin resultados.</li>}
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.href}-${i}`} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${i === active ? "bg-paper" : ""}`}
              >
                <span>
                  <span className="font-medium">{h.label}</span>
                  {h.sublabel && <span className="ml-2 text-muted">{h.sublabel}</span>}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-muted">{h.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PaletteButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("telos:palette"))}
      className="flex h-9 w-full items-center justify-between rounded-md border border-line-strong bg-surface px-3 text-sm text-muted hover:text-ink"
    >
      Buscar…
      <kbd className="num text-[11px]">⌘K</kbd>
    </button>
  );
}
