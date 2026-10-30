# Publicar TELOS en internet (gratis)

TELOS se publica con dos servicios **gratuitos que permiten uso comercial** y no piden tarjeta:

| Pieza | Servicio | Qué guarda |
|---|---|---|
| Sitio y sistema | **Netlify** (plan Free) | La aplicación y las fotos de los productos (Netlify Blobs) |
| Base de datos | **Neon** (plan Free) | Productos, inventario, ventas, clientes… |

Tiempo estimado: 20–30 minutos. Resultado: una dirección como `https://telos-hn.netlify.app`.

**Límites del plan gratis (suficientes para empezar):**
- **Netlify** no cobra nada. Si algún mes se pasa de su cuota gratuita, el sitio se pausa
  hasta el mes siguiente.
- **Neon** guarda hasta 1 GB, que equivale a decenas de miles de ventas.
- **Neon** "duerme" tras 5 minutos sin uso: la primera carga después de un rato tarda
  1–2 segundos más.

---

## Paso 0 — Pasar el código a la rama principal

Abre el *pull request* de TELOS en GitHub y pulsa **Merge pull request → Confirm merge**:
https://github.com/jhernandezfialloz-sketch/tienda-de-shopify/pull/1

## Paso 1 — Crear la base de datos en Neon

1. Entra a **neon.com** → **Sign up** (con tu cuenta de Google o GitHub). Plan **Free**.
2. **Create project**:
   - Project name: `telos`
   - Región: **AWS US East (N. Virginia)**
   - Lo demás como viene → **Create**.
3. En el panel del proyecto pulsa **Connect**. Verás una dirección que empieza por
   `postgresql://`. Necesitas **dos** versiones:
   - Con **Connection pooling** activado → cópiala: es tu **`DATABASE_URL`**
     (contiene la palabra `-pooler`).
   - Con **Connection pooling** desactivado → cópiala: es tu **`DATABASE_URL_UNPOOLED`**.

   Guárdalas en un lugar seguro (son como contraseñas: no las compartas).

## Paso 2 — Crear el sitio en Netlify

1. Entra a **netlify.com** → **Sign up** → **GitHub**. Plan **Free**.
2. **Add new project → Import an existing project → GitHub**. Autoriza a Netlify y
   elige el repositorio **tienda-de-shopify**.
3. En la configuración:
   - **Branch to deploy:** la rama principal (`claude/new-session-j8avbg`).
   - **Base directory:** `telos` ← *importante*.
   - Build command y Publish directory: déjalos como aparecen (los toma de `netlify.toml`).
4. **Add environment variables** → agrega estas 4:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | La dirección **con** pooling (paso 1) |
   | `DATABASE_URL_UNPOOLED` | La dirección **sin** pooling (paso 1) |
   | `SETUP_TOKEN` | Una clave larga que inventes (mín. 12 caracteres). **Guárdala**: la usarás en el paso 4. |
   | `TELOS_TIMEZONE` | `America/Tegucigalpa` |

5. **Deploy**. Tarda 2–4 minutos. Durante la publicación se crean solas las tablas de la base de datos.

## Paso 3 — Ponerle nombre a la dirección

1. Netlify te da una dirección al azar (ej. `https://glowing-cat-123.netlify.app`).
2. **Project configuration → Change project name** → por ejemplo `telos-hn`
   → queda `https://telos-hn.netlify.app` (si el nombre está libre).
3. **Project configuration → Environment variables → Add a variable**:
   `APP_URL` = tu dirección final (ej. `https://telos-hn.netlify.app`).
4. **Deploys → Trigger deploy → Deploy project** para aplicar el cambio.

## Paso 4 — Primer uso

1. Abre `https://telos-hn.netlify.app/admin` (con tu dirección). Te llevará a **Configurar TELOS**.
2. Escribe la **clave de configuración** (tu `SETUP_TOKEN`), tu nombre, correo y una
   contraseña (mín. 10 caracteres). Esta pantalla funciona **una sola vez**.
3. En el Dashboard pulsa **Cargar inventario inicial**. Verás el avance ("4 de 10"…);
   al terminar te lleva a Productos con las 10 prendas y sus 13 fotos, en borrador.
4. En el teléfono: abre la misma dirección → menú del navegador → **Agregar a pantalla de inicio**.

## Después

- **Cada mejora futura** se publica sola cuando se aprueba un *pull request* en la rama principal.
- **Dominio propio** (ej. `telos.hn`, se paga aparte al registrador): Netlify → **Domain management**.
- **Usuarios para tu equipo:** por ahora los crea Claude; la pantalla de usuarios llega en la Fase 2.
- **Recuperación de contraseña por correo:** aún no envía correos. Si olvidas tu contraseña, pide ayuda a Claude.
- **Respaldos:** el plan gratis de Neon guarda poco historial para restaurar. Cuando haya
  ventas reales, conviene exportar un respaldo periódico (función prevista en la Fase 2).

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| El deploy falla con `P1001` / "Can't reach database server" | `DATABASE_URL_UNPOOLED` mal copiada (paso 1.3). |
| El deploy falla con "Environment variable not found" | Falta alguna variable del paso 2.4. |
| No encuentra la carpeta o el build no arranca | **Base directory** no es `telos`, o el pull request no está aprobado (paso 0). |
| "El servidor no tiene SETUP_TOKEN configurado" | Falta la variable o tiene menos de 12 caracteres; después de agregarla, **Trigger deploy**. |
| "La clave de configuración no es correcta" | Escribe exactamente el valor de `SETUP_TOKEN`. |
| La carga del inventario se detiene | Vuelve a pulsar el botón: continúa donde quedó. |

---

### Alternativa de pago: Vercel

El código también funciona en Vercel (Neon + Vercel Blob). Su plan gratuito **no permite uso
comercial**, así que requiere el plan Pro (≈ US$20/mes). Variables: `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`, `SETUP_TOKEN`; Root Directory `telos`.
