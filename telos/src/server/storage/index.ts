import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Almacenamiento de objetos para imágenes. Los archivos NUNCA van en la base de datos:
 * se guarda solo la clave y la URL pública.
 *  - "local": carpeta UPLOADS_DIR (por defecto ./storage/uploads), servida por /uploads/[...key].
 *  - "s3": Cloudflare R2 / S3 / Supabase Storage (producción) — pendiente de conectar
 *    con las variables S3_* (ver docs/ARQUITECTURA.md).
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

export function storage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") return localDriver;
  throw new Error(`STORAGE_DRIVER "${driver}" aún no está implementado. Usa "local" o implementa el driver S3 en src/server/storage.`);
}
