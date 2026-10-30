import { db } from "@/lib/db";
import { BASE_CATEGORIES, ensureBaseData } from "@/server/services/setup";

/** Datos base reales (no demo): categorías con su código de SKU. Idempotente. */
async function main() {
  await ensureBaseData();
  console.log(`✓ ${BASE_CATEGORIES.length} categorías y configuración base listas.`);
}

main().finally(() => db.$disconnect());
