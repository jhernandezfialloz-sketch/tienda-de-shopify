import { db } from "@/lib/db";

/** Datos base reales (no demo): categorías con su código de SKU. Idempotente. */
const CATEGORIES = [
  { name: "Camisas", code: "CAM", slug: "camisas", sortOrder: 1 },
  { name: "Camisetas", code: "CMT", slug: "camisetas", sortOrder: 2 },
  { name: "Polos", code: "POL", slug: "polos", sortOrder: 3 },
  { name: "Pantalones", code: "PAN", slug: "pantalones", sortOrder: 4 },
  { name: "Gorras", code: "GOR", slug: "gorras", sortOrder: 5 },
  { name: "Accesorios", code: "ACC", slug: "accesorios", sortOrder: 6 },
];

async function main() {
  for (const c of CATEGORIES) {
    await db.category.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  await db.setting.upsert({
    where: { key: "company" },
    update: {},
    create: { key: "company", value: { name: "Distribuidora Telos", brand: "TELOS", currency: "HNL", country: "HN", timezone: "America/Tegucigalpa" } },
  });
  console.log(`✓ ${CATEGORIES.length} categorías y configuración base listas.`);
}

main().finally(() => db.$disconnect());
