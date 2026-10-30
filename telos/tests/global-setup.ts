import { execSync } from "node:child_process";

/** Aplica migraciones pendientes en la base de tests (no destructivo; cada test vacía sus tablas). */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST ?? "postgresql://telos:telos@localhost:5432/telos_test";
  if (!/test/.test(url)) throw new Error("DATABASE_URL_TEST debe apuntar a una base de datos de tests");
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "pipe",
  });
}
