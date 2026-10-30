import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/server/auth/password";

/**
 * Crea un usuario del admin.
 *   npm run user:create -- --email dueño@telos.hn --name "Nombre" [--role OWNER]
 * Contraseña: variable TELOS_PASSWORD o se genera una aleatoria y se muestra una sola vez.
 */
async function main() {
  const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" }, role: { type: "string", default: "OWNER" } } });
  if (!values.email || !values.name) throw new Error('Uso: npm run user:create -- --email x@y.com --name "Nombre" [--role OWNER|ADMIN|SALES|INVENTORY|MARKETING]');
  const role = values.role as Role;
  if (!["OWNER", "ADMIN", "SALES", "INVENTORY", "MARKETING"].includes(role)) throw new Error(`Rol inválido: ${role}`);
  const password = process.env.TELOS_PASSWORD ?? randomBytes(12).toString("base64url");
  const user = await db.user.create({
    data: { email: values.email.trim().toLowerCase(), name: values.name, role, passwordHash: await hashPassword(password) },
  });
  await db.auditLog.create({ data: { action: "user.create", entityType: "user", entityId: user.id, after: { email: user.email, role } } });
  console.log(`✓ Usuario ${user.email} (${role}) creado.`);
  if (!process.env.TELOS_PASSWORD) console.log(`  Contraseña temporal: ${password}\n  Cámbiala con "¿Olvidaste tu contraseña?" en el login.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
