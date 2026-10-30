import { defineConfig } from "vitest/config";
import path from "node:path";

const testDb = process.env.DATABASE_URL_TEST ?? "postgresql://telos:telos@localhost:5432/telos_test";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    env: { DATABASE_URL: testDb, DATABASE_URL_UNPOOLED: testDb, TELOS_TIMEZONE: "America/Tegucigalpa" },
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Los tests de integración comparten una base de datos: correr en serie.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
