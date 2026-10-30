import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Almacenamiento de objetos para imágenes. Los archivos NUNCA van en la base de datos:
 * se guarda solo la clave y la URL pública.
 *  - "local": public/uploads (desarrollo).
 *  - "s3": Cloudflare R2 / S3 / Supabase Storage (producción) — pendiente de conectar
 *    con las variables S3_* (ver docs/ARQUITECTURA.md).
 */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}

const localDriver: StorageDriver = {
  async put(key, body) {
    const file = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return { url: `/uploads/${key}` };
  },
  async delete(key) {
    await unlink(path.join(process.cwd(), "public", "uploads", key)).catch(() => undefined);
  },
};

export function storage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") return localDriver;
  throw new Error(`STORAGE_DRIVER "${driver}" aún no está implementado. Usa "local" o implementa el driver S3 en src/server/storage.`);
}
