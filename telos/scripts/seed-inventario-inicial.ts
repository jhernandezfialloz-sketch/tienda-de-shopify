import { db } from "@/lib/db";
import { loadInitialInventory } from "@/server/services/setup";
import { ownerActor } from "./_actor";

/** Carga el inventario inicial real (también disponible como botón en el dashboard). */
async function main() {
  const { log } = await loadInitialInventory(await ownerActor());
  for (const line of log) console.log(line);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
