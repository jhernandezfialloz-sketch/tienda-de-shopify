import { readFile } from "node:fs/promises";
import { localPath } from "@/server/storage";

const TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

/** Sirve las fotos del driver "local". En producción con S3/R2 las URLs apuntan al CDN. */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const file = localPath(key);
  const type = TYPES[key.split(".").pop()?.toLowerCase() ?? ""];
  if (!file || !type) return new Response("No encontrado", { status: 404 });
  try {
    const body = await readFile(file);
    // Las claves llevan marca de tiempo + aleatorio: el contenido nunca cambia.
    return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
