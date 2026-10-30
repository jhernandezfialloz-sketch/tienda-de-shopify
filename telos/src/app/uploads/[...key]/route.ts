import { storage } from "@/server/storage";

/** Sirve las fotos de los drivers "local" y "netlify". Con Vercel Blob las URLs apuntan directo a su CDN. */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (key.includes("..") || !/\.(webp|jpe?g|png)$/i.test(key)) return new Response("No encontrado", { status: 404 });
  const driver = storage();
  const file = driver.get ? await driver.get(key).catch(() => null) : null;
  if (!file) return new Response("No encontrado", { status: 404 });
  // Las claves llevan marca de tiempo + aleatorio: el contenido nunca cambia.
  return new Response(file.body, { headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
}
