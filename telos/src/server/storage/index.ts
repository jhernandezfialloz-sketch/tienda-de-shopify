import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";

/**
 * Almacenamiento de objetos para imágenes. Los archivos NUNCA van en la base de datos:
 * se guarda solo la clave y la URL pública.
 *  - "blob":  Vercel Blob (producción). Se activa solo si existe BLOB_READ_WRITE_TOKEN.
 *  - "local": carpeta UPLOADS_DIR (por defecto ./storage/uploads), servida por /uploads/[...key].
 */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
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
  const driver = process.env.STORAGE_DRIVER || (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");
  if (driver === "blob") return blobDriver;
  if (driver === "local") {
    // En Vercel el disco es temporal: las fotos se perderían.
    if (process.env.VERCEL) throw new Error("Falta conectar Vercel Blob (BLOB_READ_WRITE_TOKEN). Ver docs/PUBLICAR.md, paso 3.");
    return localDriver;
  }
  throw new Error(`STORAGE_DRIVER "${driver}" no existe. Usa "blob" o "local".`);
}
