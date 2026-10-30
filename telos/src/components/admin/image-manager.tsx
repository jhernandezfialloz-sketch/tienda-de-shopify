"use client";

import { useActionState, useTransition } from "react";
import { imageOpAction, uploadImagesAction } from "@/server/actions/products";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";

interface Img { id: string; url: string; isCover: boolean; alt: string | null }

export function ImageManager({ productId, images, canEdit }: { productId: string; images: Img[]; canEdit: boolean }) {
  const [state, upload, uploading] = useActionState(uploadImagesAction.bind(null, productId), null);
  const [pending, start] = useTransition();
  const op = (id: string, kind: "cover" | "remove" | "up" | "down") => start(async () => void (await imageOpAction(productId, id, kind)));

  return (
    <div className="flex flex-col gap-4">
      {state && !state.ok && <FormError message={state.error} />}
      {images.length === 0 ? (
        <p className="text-sm text-muted">Sin fotos todavía.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className={`overflow-hidden rounded-md border ${img.isCover ? "border-ink" : "border-line"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ""} className="aspect-square w-full object-cover" loading="lazy" />
              <div className="flex flex-wrap items-center gap-1 p-1.5 text-xs">
                {img.isCover ? <span className="px-1 font-medium">Portada</span> : canEdit && <button disabled={pending} onClick={() => op(img.id, "cover")} className="px-1 text-muted hover:text-ink">Portada</button>}
                {canEdit && (
                  <>
                    {i > 0 && <button disabled={pending} onClick={() => op(img.id, "up")} aria-label="Mover antes" className="px-1 text-muted hover:text-ink">←</button>}
                    {i < images.length - 1 && <button disabled={pending} onClick={() => op(img.id, "down")} aria-label="Mover después" className="px-1 text-muted hover:text-ink">→</button>}
                    <button disabled={pending} onClick={() => confirm("¿Eliminar esta foto?") && op(img.id, "remove")} className="ml-auto px-1 text-danger">Eliminar</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <form action={upload} className="flex flex-wrap items-center gap-2">
          <input name="files" type="file" accept="image/*" multiple className="text-sm" aria-label="Fotos" />
          <Button variant="secondary" disabled={uploading}>{uploading ? "Optimizando…" : "Subir fotos"}</Button>
          <span className="text-xs text-muted">Se convierten a WebP (máx. 1600 px) automáticamente.</span>
        </form>
      )}
    </div>
  );
}
