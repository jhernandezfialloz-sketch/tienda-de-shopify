# TELOS — Arquitectura (Fase 0)

Sistema digital central de **Distribuidora Telos**: sitio público + Telos Admin
(comprar → operar → vender → controlar) sobre una sola base de datos.

---

## 0. Análisis de requisitos: inconsistencias y mejoras adoptadas

| # | En el requisito | Problema | Decisión |
|---|---|---|---|
| 1 | Estados de venta: pendiente, confirmada, **pagada**, entregada, cancelada, devuelta | "Pagada" y "entregada" no son excluyentes (contra entrega: se entrega antes de cobrar; transferencia: se cobra antes de entregar). Una sola lista obliga a perder información. | Dos ejes: **estado de la orden** (`PENDIENTE → CONFIRMADA → ENTREGADA`, `CANCELADA`, `DEVUELTA`) y **estado de pago** (`PENDIENTE`, `PARCIAL`, `PAGADA`, `REEMBOLSADA`), calculado a partir de la tabla `payments`. |
| 2 | SKU `TLS-[CAT]-[MODELO]-[COLOR]-[TALLA]-[SEC]` y ejemplos `TLS-CAM-001`, `TLS-CAM-BLK-M-001` | Si la secuencia va al final, las variantes del mismo producto quedan separadas al ordenar, y el código del producto no es prefijo del SKU. | Producto: `TLS-{CAT}-{NNN}`. Variante: `{código producto}-{COLOR}-{TALLA}` → `TLS-CMT-001-BLK-M`. Ver §7. |
| 3 | Costo real = (mercancía + extras) / unidades | Con varios productos de precios distintos en la misma compra, repartir los extras por igual distorsiona los márgenes. | Los extras se **prorratean por el valor de cada línea** (sin perder centavos). Con un solo producto el resultado es exactamente la fórmula pedida. |
| 4 | Tabla `inventory` + stock en variantes | Stock en dos lugares = inconsistencias. | El stock vive **solo** en `inventory` (1 fila por variante). La variante no tiene columna de stock. |
| 5 | Tabla `roles` | Roles editables desde la UI complican la seguridad sin beneficio hoy (5 roles fijos). | Roles como `enum` + matriz de permisos en código (`src/server/auth/permissions.ts`), verificada en servidor. Migrable a tabla si algún día se necesitan roles personalizados. |
| 6 | "Reservar/descontar" al confirmar venta | Ambiguo. | Venta **pendiente** no toca stock; **confirmar** descuenta. `inventory.reserved` existe para pedidos web futuros (Fase 3/4). |
| 7 | "Eliminar producto" | Borrar productos rompe el historial de ventas y movimientos. | Eliminar = **archivar** (soft delete). Movimientos de inventario son **inmutables** (trigger en la base de datos). |
| 8 | Costo de la venta | Si el costo cambia después, la utilidad histórica cambiaría. | Al confirmar, cada línea guarda su **costo histórico** (`sale_items.unit_cost`). Costo de variante = **promedio ponderado** actualizado al recibir compras. |
| 9 | Métricas sin datos | — | Si falta un costo, la utilidad queda **vacía** (no 0) y se muestra "No hay suficientes datos"; se crea una notificación `MISSING_COST`. |
| 10 | Ventas duplicadas | Doble clic / reintentos de red. | `idempotency_key` única por formulario/API + actualizaciones condicionadas de estado. |

Mejoras añadidas por necesidad operativa: estado de pago con pagos parciales,
bloqueo de cuenta tras 5 intentos fallidos, categoría/códigos `DEM` para datos
demo, alertas de "agotado" separadas de "stock bajo".

---

## 1. Arquitectura propuesta

Monolito modular (no microservicios: no se justifica para el tamaño de Telos).

```
┌──────────────────────────── Next.js (un solo despliegue) ─────────────────────────────┐
│  Sitio público  (/ , /productos, /productos/[código])        ← Fase 3                 │
│  Telos Admin    (/admin/**)  Server Components + Server Actions                       │
│  API REST       (/api/**)    JSON, misma lógica que el admin                          │
│                    │                    │                     │                       │
│                    └──────────► Servicios de dominio (src/server/services) ◄── AI tools │
│                                  · validación (zod) · permisos · transacciones         │
│                                  · auditoría · eventos (outbox)                         │
└──────────────────────────────────────────┬────────────────────────────────────────────┘
                                           │ Prisma
                          PostgreSQL (fuente de verdad, CHECKs, triggers)
                                           │
                        Almacenamiento de objetos (fotos: R2/S3; local en dev)
```

Regla central: **la lógica de negocio vive en `src/server/services`**. Las páginas,
las acciones de formulario, la API y los futuros agentes de IA solo llaman servicios.

## 2. Stack

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript estricto** | Un solo proyecto para web pública, admin y API; Server Components = poco JS en el cliente (rápido en móvil). |
| Base de datos | **PostgreSQL 16** | Transacciones, `SELECT … FOR UPDATE`, CHECK constraints, triggers. Crítico para inventario. |
| ORM | **Prisma 6** | Esquema declarativo legible para humanos y agentes; migraciones versionadas. SQL crudo donde se necesita (bloqueos, agregados). |
| Validación | **Zod 4** | Mismo esquema para formularios y API. |
| Estilos | **Tailwind CSS 4** + design system propio (`globals.css`, `src/components/ui`) | Sin librería de plantillas SaaS. |
| Autenticación | Sesiones propias en DB (cookie httpOnly, token con hash SHA-256, scrypt) | Simple, auditable, sin dependencias; revocables al cambiar contraseña. |
| Imágenes | `sharp` (WebP, 1600 px) + driver de almacenamiento (`local` / S3-compatible) | Archivos fuera de la DB. |
| Tests | **Vitest** contra PostgreSQL real (`telos_test`) | La integridad del inventario se prueba con la base de datos de verdad. |
| Despliegue recomendado | Vercel (app) + Neon o Supabase (Postgres con backups/PITR) + Cloudflare R2 (fotos) | Gestionado, barato a esta escala. **Pendiente de tu decisión** (implica cuentas y costos). |

## 3. Esquema de base de datos

Archivo: `prisma/schema.prisma` + restricciones en `prisma/migrations/*/migration.sql`.

```
users ─┬─ sessions, password_reset_tokens
       └─ (autor de) inventory_movements, sales, purchases, payments, audit_logs

categories 1─* products 1─* product_variants 1─1 inventory
                    │              ├─* inventory_movements   (libro mayor inmutable)
                    │              ├─* sale_items  *─1 sales ─* payments
                    │              │                    └─*1 customers
                    │              └─* purchase_items *─1 purchases *─1 suppliers
                    ├─* product_images (solo URL/clave)
                    └─* supplier_products *─1 suppliers

social_metrics · marketing_expenses · notifications · audit_logs
domain_events (outbox) · sequences (contadores) · settings (JSON)
```

Integridad garantizada **por la base de datos** (no solo por el código):

- `inventory.on_hand >= 0`, `0 <= reserved <= on_hand`
- `inventory_movements`: `before + change = after`, `after >= 0`, `change <> 0`, y trigger que **impide UPDATE/DELETE**
- SKU único y con formato `^[A-Z0-9]+(-[A-Z0-9]+)*$`; código de barras único
- Precios, costos, cantidades y montos no negativos; cantidades > 0
- Venta: una línea por variante (`UNIQUE(sale_id, variant_id)`); `idempotency_key` única
- Dinero `Decimal(12,2)` (nunca texto); fechas `timestamptz` en UTC

`is_demo` en todas las tablas operativas permite borrar los datos demo sin tocar los reales.

## 4. Módulos

```
            COMPRAR                  OPERAR                     VENDER                 CONTROLAR
     ┌───────────────────┐   ┌────────────────────┐    ┌───────────────────┐   ┌──────────────────────┐
     │ Proveedores       │   │ Productos/Variantes│    │ Clientes          │   │ Dashboard (KPIs)     │
     │ Compras ──recibir─┼──►│ Inventario         │◄───┼─confirmar Ventas  │──►│ Métricas / Reportes  │
     └───────────────────┘   │ Movimientos        │    │ Pagos · Canales   │   │ Auditoría · Actividad│
                             └────────────────────┘    └───────────────────┘   └──────────────────────┘
   Transversal: registrar (formularios/API) · permisos · audit_logs · domain_events · notificaciones
```

## 5. Estructura de carpetas

```
telos/
├─ AGENTS.md                  Guía para Codex/Claude y otros agentes
├─ prisma/                    schema.prisma + migraciones SQL
├─ scripts/                   seed base, usuarios, demo, purga demo, inventario inicial
├─ fotos-productos/           Fotos originales enviadas por el dueño
├─ docs/                      ARQUITECTURA.md, API.md, INVENTARIO-INICIAL.md
├─ tests/                     unit.test.ts (reglas puras) · integration.test.ts (Postgres)
└─ src/
   ├─ app/
   │  ├─ page.tsx             Sitio público (Fase 3)
   │  ├─ admin/login|recuperar|restablecer
   │  ├─ admin/(panel)/…      Pantallas del admin (protegidas)
   │  └─ api/…                API REST
   ├─ components/ui/          Design system (Button, Field, Table, Badge…)
   ├─ components/admin/       Componentes del admin (formularios, paleta Cmd+K…)
   ├─ lib/                    db, money, dates, metrics, errors, ai-tools/
   └─ server/
      ├─ auth/                contraseñas, sesiones, permisos
      ├─ services/            ← LÓGICA DE NEGOCIO (inventario, ventas, compras, SKU…)
      ├─ validation/          esquemas zod
      ├─ actions/             Server Actions (adaptadores de la UI → servicios)
      ├─ storage/             almacenamiento de imágenes
      └─ api.ts               envoltorio de la API (auth, CSRF, errores)
```

## 6. Flujo Comprar → Operar → Vender → Controlar

```
COMPRAR   Compra BORRADOR/ORDENADA ──► ENVIADA ──► RECIBIDA (una sola vez)
                                                     │  por cada línea, en una transacción:
                                                     │   · costo real unitario (prorrateo de extras)
                                                     │   · +stock  (movimiento COMPRA)
                                                     │   · costo promedio ponderado de la variante
                                                     ▼   · evento PURCHASE_RECEIVED
OPERAR    inventory (on_hand) ◄── ajustes manuales con razón: INICIAL, AJUSTE, CORRECCION, DANO, PERDIDA, DEVOLUCION
                                                     │   · alerta STOCK_LOW / OUT_OF_STOCK al cruzar el mínimo
                                                     ▼
VENDER    Venta PENDIENTE ──confirmar──► CONFIRMADA ──► ENTREGADA ──► DEVUELTA (+stock)
              │                              │
              └──cancelar──► CANCELADA ◄──────┘ (si ya descontó: +stock, movimiento CANCELACION)
          Confirmar = transacción: validar stock · bloquear filas · −stock (VENTA) · costo histórico · utilidad
          Pagos: parciales o totales → payment_status
                                                     ▼
CONTROLAR  KPIs (hoy/semana/mes), valor de inventario, stock bajo, antigüedad, auditoría, eventos
```

## 7. Sistema de códigos (SKU)

| Nivel | Formato | Ejemplo | Uso |
|---|---|---|---|
| ID interno | cuid | `cmvug…` | Relaciones en la DB. Nunca se muestra al cliente. |
| Producto | `TLS-{CAT}-{NNN}` | `TLS-CMT-001` | URL pública `/productos/TLS-CMT-001`, búsqueda. Secuencia atómica por categoría. |
| Variante (SKU) | `{PRODUCTO}-{COLOR}-{TALLA}` | `TLS-CMT-001-BLK-M` | Inventario, ventas, etiquetas. |
| Código de barras | libre, único | `7401234567890` | Escáner (lector USB = teclado + Enter, ya funciona en el buscador de ventas/compras). |

- Categorías: `CAM` camisas, `CMT` camisetas, `POL` polos, `PAN` pantalones, `GOR` gorras, `ACC` accesorios (`DEM` reservado para demo).
- Colores: tabla en `src/server/services/sku.ts` (Negro→BLK, Blanco→WHT, Azul marino→NVY…); colores no mapeados usan sus 3 primeras letras.
- Tallas: `S, M, L, XL…`; "Única/ajustable" → `U`.
- El SKU se genera solo, pero el administrador puede escribir uno manual (se valida formato y unicidad).
- Preparado para: etiquetas con código de barras/QR (el QR codificará la URL `/productos/{código}`), escaneo en venta.

## 8. Movimientos de inventario

Única vía para cambiar stock: `applyStockChange()` en `src/server/services/inventory.ts`.

1. Bloquea la fila (`SELECT … FOR UPDATE`; varias filas en orden estable para evitar interbloqueos).
2. Calcula `después = antes + cambio`; si < 0 → error `INSUFFICIENT_STOCK` con mensaje útil.
3. Actualiza `inventory` y escribe `inventory_movements` (antes, cambio, después, tipo, razón, referencia, usuario, costo).
4. Si cruza el mínimo → notificación + evento.

Tipos: `INICIAL, COMPRA, VENTA, DEVOLUCION, CORRECCION, DANO, PERDIDA, AJUSTE, CANCELACION`.
Los movimientos no se editan ni se borran (trigger). Un error se corrige con otro movimiento.

## 9. API

Convenciones: JSON; respuesta `{ "data": … }` o `{ "error": { "code", "message", "details" } }`;
códigos `VALIDATION 422`, `UNAUTHENTICATED 401`, `FORBIDDEN 403`, `NOT_FOUND 404`,
`CONFLICT / INSUFFICIENT_STOCK / INVALID_TRANSITION 409`. Detalle en [`API.md`](./API.md).

```
GET    /api/products            ?q&categoryId&status&page&pageSize
POST   /api/products
GET    /api/products/:id        (id o código TLS-…)
PATCH  /api/products/:id
DELETE /api/products/:id        (archiva)
GET    /api/inventory           ?q&filter=low|out|all&page
POST   /api/inventory/adjustments
GET    /api/sales               ?q&status&channel&page
POST   /api/sales               (idempotencyKey recomendado)
POST   /api/sales/:id/transition   { to, reason? }
POST   /api/sales/:id/payments     { amount, method, reference? }
GET    /api/purchases           ?q&status&page
POST   /api/purchases
POST   /api/purchases/:id/transition { to }
GET    /api/search?q            (búsqueda global)
GET    /api/variants/search?q
```

Seguridad: sesión por cookie httpOnly/SameSite=Lax + verificación de `Origin` en
métodos de escritura. Fase 4: claves de API con alcance (scopes) para integraciones.

## 10. Automatizaciones y Codex

- **Eventos de dominio (outbox):** cada servicio escribe en `domain_events` dentro de
  la misma transacción (`SALE_CONFIRMED`, `PURCHASE_RECEIVED`, `STOCK_LOW`, …). Si la
  operación falla, el evento no existe; si existe, la operación ocurrió.
- **Despachador (Fase 4):** proceso/cron que lee eventos `PENDING`, los entrega a
  webhooks suscritos (firma HMAC-SHA256 en cabecera `X-Telos-Signature`, con
  marca de tiempo y reintentos exponenciales) y los marca `PROCESSED`/`FAILED`.
- **Webhooks entrantes (Fase 4):** `POST /api/webhooks/{fuente}` con verificación de firma por fuente.
- **AI tools:** `src/lib/ai-tools/read-tools.ts` (solo lectura, ya disponible):
  `getInventory`, `getLowStockProducts`, `getInventoryValue`, `getSalesMetrics`.
  Las de escritura (`write-tools.ts`) reutilizarán los servicios, con un usuario de
  rol limitado, y las destructivas exigirán confirmación humana.
- **Codex/Claude sobre el código:** `AGENTS.md` define reglas, comandos y funciones que nunca deben romperse.
  Ningún agente modifica la base de datos con SQL arbitrario: siempre servicios o API.

## 11. Autenticación y roles

Login con correo/contraseña (scrypt), sesión de 30 días en DB (hash del token),
bloqueo de 15 min tras 5 intentos, recuperación por enlace de 1 hora (se cierra
toda sesión al cambiar contraseña). Middleware redirige sin cookie; **cada página,
acción y endpoint verifica sesión y permiso en el servidor**.

| Rol | Puede |
|---|---|
| OWNER | Todo |
| ADMIN | Todo excepto gestionar usuarios |
| SALES | Ver productos/stock, registrar ventas y clientes (no cancelar ventas confirmadas, no ve costos) |
| INVENTORY | Productos, inventario, compras, recepción, proveedores |
| MARKETING | Lectura de productos/ventas/clientes, marketing y reportes |

## 12. Backups

Producción en Postgres gestionado con **PITR** (Neon/Supabase: restauración a cualquier
minuto de los últimos 7+ días) + `pg_dump` diario cifrado a R2 con retención 30 días.
Protección adicional: soft delete de productos, movimientos inmutables, audit_logs.
Probar una restauración cada trimestre.

## 13. Roadmap

| Fase | Contenido | Estado |
|---|---|---|
| 0 Arquitectura | Este documento, esquema, design system, seguridad | ✅ |
| 1 Core | Auth + roles, productos y variantes, SKU, fotos, inventario, movimientos, ventas, pagos, compras, clientes/proveedores básicos, notificaciones, actividad, Cmd+K, API REST, tests | ✅ |
| 2 Control | Gráfica de ventas, top/menos vendidos, ventas por canal, rentabilidad, inventario inmovilizado con valor atrapado, reportes con exportación CSV/Excel, ficha de cliente/proveedor, configuración y usuarios desde la UI | Siguiente |
| 3 Website | Home editorial, `/productos` con filtros, ficha `/productos/TLS-…`, WhatsApp, SEO (sitemap, OG, schema.org), tracking de eventos | |
| 4 Automatización | Despachador de eventos, webhooks, claves de API, AI write-tools, driver S3/R2 | |
| 5 Expansión | Métricas sociales y funnel, importación CSV/Excel con preview, etiquetas con código de barras/QR, forecasting y sugerencias de reposición | |
