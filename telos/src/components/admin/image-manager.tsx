"use client";

import { useRef, useState, useTransition } from "react";
import { imageOpAction, uploadImagesAction } from "@/server/actions/products";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form";

interface Img { id: string; url: string; isCover: boolean; alt: string | null }

export function ImageManager({ productId, images, canEdit }: { productId: string; images: Img[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Una foto por solicitud y reducida en el navegador: en Vercel cada solicitud admite máx. 4.5 MB.
  const upload = async () => {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) return;
    setError(null);
    for (const [i, file] of files.entries()) {
      setUploading(`Subiendo ${i + 1} de ${files.length}…`);
      const form = new FormData();
      form.append("files", await shrink(file));
      const res = await uploadImagesAction(productId, null, form);
      if (!res.ok) {
        setError(res.error);
        break;
      }
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const op = (id: string, kind: "cover" | "remove" | "up" | "down") => start(async () => void (await imageOpAction(productId, id, kind)));

  return (
    <div className="flex flex-col gap-4">
      <FormError message={error} />
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void upload();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input ref={inputRef} name="files" type="file" accept="image/*" multiple className="text-sm" aria-label="Fotos" />
          <Button variant="secondary" disabled={!!uploading}>{uploading ?? "Subir fotos"}</Button>
          <span className="text-xs text-muted">Se convierten a WebP (máx. 1600 px) automáticamente.</span>
        </form>
      )}
    </div>
  );
}

/** Reduce la foto a máx. 2000 px (JPEG) antes de enviarla. Si el navegador no puede leerla, envía el original. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
