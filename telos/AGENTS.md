# AGENTS.md — Guía para Codex, Claude y otros agentes

## Qué es Telos

**TELOS** es el sistema digital central de *Distribuidora Telos* (moda masculina, Honduras):
sitio público + **Telos Admin** para comprar, operar (inventario), vender y controlar.
Moneda: Lempira (HNL). Zona horaria: America/Tegucigalpa. Idioma de la UI: español.

Arquitectura completa: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). API: [`docs/API.md`](docs/API.md).
Publicación (Netlify + Neon, gratis; Vercel como alternativa): [`docs/PUBLICAR.md`](docs/PUBLICAR.md). Las migraciones se aplican solas en cada deploy (`netlify.toml` / `vercel-build`).

## Comandos

```bash
npm run dev                 # servidor de desarrollo (http://localhost:3000)
npm run typecheck           # TypeScript estricto — debe pasar
npm test                    # Vitest (requiere Postgres con DATABASE_URL_TEST)
npm run build               # build de producción — debe pasar
npm run db:migrate          # crear/aplicar migración en desarrollo
npm run db:seed             # categorías y configuración base
npm run user:create -- --email x@y.com --name "Nombre" --role OWNER
npm run seed:demo           # datos DEMO (is_demo=true)
npm run demo:purge          # borra todos los datos demo
```

## Estructura

- `src/server/services/` — **toda la lógica de negocio**. Empieza aquí.
- `src/server/validation/` — esquemas zod (entrada de UI y API).
- `src/server/auth/` — sesiones, contraseñas, matriz de permisos.
- `src/server/actions/` — Server Actions: adaptadores finos UI → servicios.
- `src/app/api/` — API REST: adaptadores finos HTTP → servicios (`src/server/api.ts`).
- `src/app/admin/(panel)/` — pantallas del admin. `src/components/ui/` — design system.
- `src/lib/` — utilidades puras (dinero, fechas, métricas, errores) y `ai-tools/`.
- `prisma/schema.prisma` — modelo de datos. Restricciones CHECK y triggers en las migraciones SQL.

## Reglas del proyecto (obligatorias)

1. **El stock solo cambia con `applyStockChange` / `applyStockChanges`** (`services/inventory.ts`), dentro de una transacción. Nunca `UPDATE inventory` directo ni `prisma.inventory.update` fuera de ese archivo.
2. **Los movimientos de inventario son inmutables.** No se editan ni se borran; los errores se corrigen con un movimiento nuevo.
3. **Dinero:** calcular en centavos enteros (`src/lib/money.ts`: `toCents`, `fromCents`, `formatHNL`). Guardar `Decimal(12,2)`. Nunca `number` con decimales ni texto `"L 600"`.
4. **Permisos en servidor:** todo servicio que escribe empieza con `assertCan(actor, "…")`. Esconder botones no es seguridad.
5. **Validar en servidor** con zod (`parse(schema, input)`); los errores de negocio son `TelosError` con mensaje útil en español.
6. **Auditoría:** toda escritura administrativa llama a `audit(tx, …)` y, si es relevante, `emit(tx, "EVENTO", …)` dentro de la misma transacción.
7. **No inventar datos.** Si falta información para una métrica, devolver "No hay suficientes datos" (`src/lib/metrics.ts`). Datos de prueba solo con `isDemo: true`.
8. Lógica de negocio fuera de los componentes. Archivos pequeños y con un propósito.
9. Nada de claves ni secretos en el código, en prompts ni en el frontend: solo variables de entorno (`.env.example`).
10. Migraciones: nunca editar una migración ya aplicada; crear una nueva. **Nunca** correr `prisma migrate reset` contra una base que no sea de desarrollo.

## Funciones que nunca deben romperse (cubiertas por tests)

- Confirmar venta descuenta stock exactamente una vez (incluso con clics concurrentes).
- Si falta stock, la venta **no** se registra.
- Cancelar/devolver repone stock una sola vez.
- Recibir una compra suma stock una sola vez, con costo real y promedio ponderado.
- Stock nunca negativo (código + CHECK en la base de datos).
- SKU únicos y con formato válido; códigos `TLS-{CAT}-{NNN}`, `TEL-V-#####`, `TEL-C-#####` secuenciales.
- Permisos por rol aplicados en servidor.

## Antes de modificar

1. Lee `docs/ARQUITECTURA.md` y el servicio que vas a tocar.
2. Si cambias reglas de inventario/ventas/compras, agrega o ajusta tests en `tests/`.
3. Corre `npm run typecheck && npm test && npm run build`. Todo debe pasar.
4. Si cambias el esquema: `npm run db:migrate -- --name descripcion` y documenta en ARQUITECTURA.md §3.
5. Si agregas un endpoint: documéntalo en `docs/API.md`.

## Estilo de código

TypeScript estricto (`noUncheckedIndexedAccess`). Nombres de código en inglés, textos de UI y
mensajes de error en español. Componentes de servidor por defecto; `"use client"` solo para
interactividad. Tailwind con los tokens de `src/app/globals.css` (paper, ink, muted, line, olive,
ok, warn, danger); números con la clase `num`. Comentarios solo donde explican un *por qué*.

## Pruebas

- `tests/unit.test.ts`: funciones puras (dinero, SKU, márgenes, máquinas de estado, permisos).
- `tests/integration.test.ts`: servicios contra Postgres real (`telos_test`), cada test vacía las tablas.

## Agentes de IA sobre los datos del negocio

Usa `src/lib/ai-tools/read-tools.ts` (solo lectura, con permisos). No escribas SQL contra la base
de datos de producción. Las herramientas de escritura llegarán en la Fase 4 y siempre pasarán por los servicios.
