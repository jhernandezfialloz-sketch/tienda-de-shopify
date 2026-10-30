import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";
import { getStore } from "@netlify/blobs";

/**
 * Almacenamiento de objetos para imágenes. Los archivos NUNCA van en la base de datos:
 * se guarda solo la clave y la URL pública.
 *  - "netlify": Netlify Blobs (producción gratuita). Se activa solo al compilar en Netlify.
 *  - "blob":    Vercel Blob. Se activa si existe BLOB_READ_WRITE_TOKEN.
 *  - "local":   carpeta UPLOADS_DIR (por defecto ./storage/uploads).
 * "netlify" y "local" se sirven por la ruta /uploads/[...key]; "blob" tiene URL pública propia.
 */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
  /** Solo para drivers servidos por /uploads (local, netlify). */
  get?(key: string): Promise<{ body: ArrayBuffer; contentType: string } | null>;
}

export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "storage", "uploads"));

/** Ruta absoluta de una clave, impidiendo salir de UPLOADS_DIR ("../"). */
export function localPath(key: string): string | null {
  const file = path.resolve(UPLOADS_DIR, key);
  return file.startsWith(UPLOADS_DIR + path.sep) ? file : null;
}

const localDriver: StorageDriver = {
  async put(key, body) {
    const file = localPath(key);
    if (!file) throw new Error("Clave de archivo inválida");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return { url: `/uploads/${key}` };
  },
  async delete(key) {
    const file = localPath(key);
    if (file) await unlink(file).catch(() => undefined);
  },
  async get(key) {
    const file = localPath(key);
    if (!file) return null;
    try {
      const buf = await readFile(file);
      return { body: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, contentType: key.endsWith(".webp") ? "image/webp" : "image/jpeg" };
    } catch {
      return null;
    }
  },
};

// Consistencia fuerte: la foto se puede leer apenas se sube (la eventual tarda hasta 60 s).
const netlifyStore = () => getStore({ name: "fotos", consistency: "strong" });

const netlifyDriver: StorageDriver = {
  async put(key, body, contentType) {
    const data = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
    await netlifyStore().set(key, data, { metadata: { contentType } });
    return { url: `/uploads/${key}` };
  },
  async delete(key) {
    await netlifyStore().delete(key).catch(() => undefined);
  },
  async get(key) {
    const result = await netlifyStore().getWithMetadata(key, { type: "arrayBuffer" });
    if (!result) return null;
    return { body: result.data, contentType: String(result.metadata.contentType ?? "image/webp") };
  },
};

const blobDriver: StorageDriver = {
  async put(key, body, contentType) {
    // La clave ya es única (marca de tiempo + aleatorio): no hace falta sufijo extra.
    const result = await put(key, body, { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    return { url: result.url };
  },
  async delete(key) {
    await del(key).catch(() => undefined);
  },
};

export function storage(): StorageDriver {
  const driver =
    process.env.STORAGE_DRIVER ||
    // En Netlify: marca fijada al compilar o, como respaldo, el entorno Lambda de sus funciones.
    (process.env.TELOS_BUILT_ON_NETLIFY === "1" || (process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL)
      ? "netlify"
      : process.env.BLOB_READ_WRITE_TOKEN
        ? "blob"
        : "local");
  if (driver === "netlify") return netlifyDriver;
  if (driver === "blob") return blobDriver;
  if (driver === "local") {
    // En Vercel el disco es temporal: las fotos se perderían.
    if (process.env.VERCEL) throw new Error("Falta conectar Vercel Blob (BLOB_READ_WRITE_TOKEN).");
    return localDriver;
  }
  throw new Error(`STORAGE_DRIVER "${driver}" no existe. Usa "netlify", "blob" o "local".`);
}
