# Publicar TELOS en internet

Todo se hace desde el navegador, en **una sola cuenta de Vercel**:

| Pieza | Servicio | Qué guarda |
|---|---|---|
| Aplicación | Vercel | El sistema (web + admin) |
| Base de datos | Neon (se crea desde Vercel) | Productos, inventario, ventas… |
| Fotos | Vercel Blob | Las fotos de los productos |

Tiempo estimado: 20–30 minutos.

> **Costo:** el plan gratuito de Vercel (Hobby) es solo para uso personal, no comercial.
> TELOS es el sistema de un negocio, así que corresponde el plan **Pro** (unos US$20/mes).
> Neon y Blob tienen niveles gratuitos que alcanzan para empezar.

---

## Paso 0 — Pasar el código a la rama principal

Vercel publica la rama principal (`main`) del repositorio, y el código de TELOS
todavía está en la rama `claude/new-session-8k1jfi`. Pide a Claude que abra un
*pull request* hacia `main` y apruébalo en GitHub (**Merge pull request**). Desde
entonces, cada cambio aprobado en `main` se publica solo.

## Paso 1 — Crear la cuenta de Vercel

1. Entra a **vercel.com** → **Sign Up** → **Continue with GitHub** (usa la misma cuenta
   de GitHub donde está el repositorio `tienda-de-shopify`).
2. Elige el plan **Pro**.

## Paso 2 — Importar el proyecto

1. En Vercel: **Add New… → Project**.
2. Busca el repositorio **tienda-de-shopify** → **Import**.
   (Si no aparece: **Adjust GitHub App Permissions** y dale acceso a ese repositorio).
3. En la pantalla de configuración:
   - **Project Name:** `telos`
   - **Root Directory:** pulsa **Edit** y elige la carpeta **`telos`**. *(Importante.)*
   - **Framework Preset:** Next.js (lo detecta solo).
   - Abre **Environment Variables** y agrega estas dos:

     | Name | Value |
     |---|---|
     | `SETUP_TOKEN` | Una clave larga que inventes (mín. 12 caracteres). **Guárdala**: la usarás en el paso 5. |
     | `TELOS_TIMEZONE` | `America/Tegucigalpa` |
4. Pulsa **Deploy**. **Este primer intento va a fallar** porque todavía no hay base de datos. Es normal.

## Paso 3 — Crear la base de datos y el almacén de fotos

Dentro del proyecto `telos` en Vercel, pestaña **Storage**:

1. **Create Database → Neon (Serverless Postgres)** → acepta los términos →
   región **Washington, D.C. (us-east-1)** → plan **Free** → **Create**.
   Cuando pregunte, **conéctala al proyecto `telos`** con todos los entornos marcados.
   Esto agrega solas las variables `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
2. Otra vez **Create Database → Blob** → nombre `telos-fotos` → **Create** →
   conéctalo al proyecto `telos`. Esto agrega `BLOB_READ_WRITE_TOKEN`.

Verifica en **Settings → Environment Variables** que existan: `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`, `SETUP_TOKEN`, `TELOS_TIMEZONE`.

## Paso 4 — Publicar

**Deployments** → en el último intento, menú **⋯ → Redeploy**. Al terminar (2–3 min)
verás **Ready** y una dirección del tipo `https://telos-xxxx.vercel.app`.

Durante la publicación se crean automáticamente todas las tablas de la base de datos.

Luego, en **Settings → Environment Variables**, agrega `APP_URL` con esa dirección
(ej. `https://telos-xxxx.vercel.app`) y vuelve a hacer **Redeploy**.

## Paso 5 — Primer uso

1. Abre `https://telos-xxxx.vercel.app/admin`. Te llevará a **Configurar TELOS**.
2. Escribe la **clave de configuración** (tu `SETUP_TOKEN`), tu nombre, correo y una
   contraseña (mín. 10 caracteres). Esta pantalla funciona **una sola vez**.
3. En el Dashboard pulsa **Cargar inventario inicial**: crea los 10 productos de tus
   fotos (en borrador) con sus 13 fotos.
4. Desde el teléfono, abre la misma dirección y agrégala a la pantalla de inicio.

## Después

- **Dominio propio** (ej. `admin.telos.hn`): Vercel → **Settings → Domains**.
- **Usuarios para tu equipo:** por ahora los crea Claude; la pantalla de usuarios llega en la Fase 2.
- **Recuperación de contraseña por correo:** aún no envía correos (el enlace queda en los
  registros del servidor). Si olvidas tu contraseña, pide ayuda a Claude.
- **Respaldos:** Neon guarda historial para restaurar la base de datos; el plan gratuito
  conserva poco tiempo. Cuando registres ventas reales, conviene subir a un plan de pago de Neon.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| El deploy falla con `DATABASE_URL_UNPOOLED` o "Environment variable not found" | La base de datos de Neon no está conectada al proyecto (paso 3.1). |
| "Falta conectar Vercel Blob" al subir fotos | Falta el almacén Blob (paso 3.2). |
| "El servidor no tiene SETUP_TOKEN configurado" | Falta la variable o tiene menos de 12 caracteres (paso 2); después de agregarla, Redeploy. |
| "La clave de configuración no es correcta" | Escribe exactamente el valor de `SETUP_TOKEN`. |
| No aparece la carpeta `telos` en Root Directory | El código aún no está en `main` (paso 0). |
