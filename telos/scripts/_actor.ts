import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/permissions";

/** Los scripts actúan en nombre del primer usuario OWNER (queda en la auditoría). */
export async function ownerActor(): Promise<Actor> {
  const owner = await db.user.findFirst({ where: { role: "OWNER", active: true }, orderBy: { createdAt: "asc" } });
  if (!owner) {
    console.error("No hay un usuario OWNER. Créalo primero: npm run user:create -- --email tu@correo --name \"Tu nombre\"");
    process.exit(1);
  }
  return { id: owner.id, role: owner.role, name: owner.name };
}
