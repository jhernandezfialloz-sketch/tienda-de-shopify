# TELOS

Sistema digital central de **Distribuidora Telos**: sitio público + Telos Admin
(compras, inventario, ventas, clientes, proveedores, métricas).

- Arquitectura y decisiones: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
- API REST: [`docs/API.md`](docs/API.md)
- Inventario inicial desde fotos: [`docs/INVENTARIO-INICIAL.md`](docs/INVENTARIO-INICIAL.md)
- Guía para Codex/Claude: [`AGENTS.md`](AGENTS.md)
- **Publicar en internet (Vercel):** [`docs/PUBLICAR.md`](docs/PUBLICAR.md)

## Requisitos

Node.js 20+ y PostgreSQL 14+.

## Puesta en marcha (desarrollo)

```bash
cd telos
npm install
cp .env.example .env              # ajusta DATABASE_URL
npm run db:deploy                 # crea las tablas
npm run db:seed                   # categorías y configuración base
npm run user:create -- --email tu@correo.com --name "Tu nombre"   # o usa /admin/primer-uso con SETUP_TOKEN
npm run seed:inventario-inicial   # o el botón "Cargar inventario inicial" del dashboard
npm run dev                       # http://localhost:3000/admin
```

Opcional: `npm run seed:demo` carga datos de prueba marcados como DEMO
(productos `TLS-DEM-…`); `npm run demo:purge` los elimina sin tocar los datos reales.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL principal (en Vercel/Neon: conexión con pooler) |
| `DATABASE_URL_UNPOOLED` | Conexión directa para migraciones (en local, igual a `DATABASE_URL`) |
| `DATABASE_URL_TEST` | Base de datos solo para tests (se vacía en cada corrida) |
| `APP_URL` | URL pública (enlaces de recuperación de contraseña) |
| `TELOS_TIMEZONE` | Zona horaria para mostrar fechas (por defecto `America/Tegucigalpa`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob para fotos (producción). Sin él, se usa la carpeta local `storage/uploads` |
| `UPLOADS_DIR` | Carpeta de fotos en modo local (opcional) |
| `SETUP_TOKEN` | Clave para crear el primer dueño en `/admin/primer-uso` |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Tests unitarios + integración (Postgres `DATABASE_URL_TEST`) |
| `npm run db:migrate` | Nueva migración (desarrollo) |
| `npm run db:deploy` | Aplica migraciones (producción) |
| `npm run user:create` | Crea usuario (`--role OWNER|ADMIN|SALES|INVENTORY|MARKETING`) |
| `npm run seed:demo` / `demo:purge` | Datos demo |

## Qué funciona hoy (Fases 0 y 1)

- Login, cierre de sesión, recuperación de contraseña, 5 roles con permisos en servidor.
- Productos con variantes (color/talla), SKU automático o manual, fotos optimizadas a WebP.
- Inventario por variante con ajustes (corrección por conteo, daño, pérdida, devolución…),
  historial inmutable de movimientos, stock mínimo y alertas, antigüedad sin venta, valor a costo y a precio.
- Ventas con canal, cliente, descuentos, pagos parciales, confirmación (descuenta stock),
  entrega, cancelación y devolución (reponen stock), costo histórico y utilidad.
- Compras con transporte/impuestos/otros, recepción que suma stock con costo real y promedio ponderado.
- Clientes y proveedores, notificaciones, actividad/auditoría, dashboard con KPIs reales,
  búsqueda global y paleta de comandos (⌘K / Ctrl+K), API REST, panel usable en el teléfono.
