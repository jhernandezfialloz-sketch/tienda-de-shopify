# ESTADO del proyecto — CasaZen

- Tienda: h83add-wh.myshopify.com (país Honduras, moneda HNL)
- Tema de trabajo: **CasaZen v1** — gid://shopify/OnlineStoreTheme/192066486560 (SIN publicar)
- Tema en vivo: Horizon (gid://shopify/OnlineStoreTheme/191910379808)
- Vista previa: https://h83add-wh.myshopify.com/?preview_theme_id=192066486560
- Cómo se edita: Admin API (`themeFilesUpsert`) desde el conector de Shopify; las
  escrituras solo se permiten en temas NO publicados.

## Productos
1. Espátula Ultrasónica Facial 4 en 1 — L 1,199
2. Masajeador Corporal Anticelulitis — L 1,899
3. Corrector de Postura Inteligente — L 849 / L 1,099 (Type B / Type A)
Todos usan `templates/product.json` (sección `cz-producto`).

## Diseño
- Paleta: fondo #FAF8F5, superficie #F1ECE6, texto #1F1B18, gris #6F655D, acento #B88A6A, línea #E4DDD5
- Fuentes: Manrope (secciones cz-), Inter (tema)
- Secciones propias (prefijo `cz-`): hero, confianza, productos, antes-despues,
  beneficios, resenas, pasos, faq, cta, producto. Assets: cz-styles.css, cz-scripts.js, cz-favicon.svg
- Reseñas y Antes/Después quedan ocultas al cliente hasta tener contenido REAL
  (no inventar reseñas ni fotos).

## Hecho (2026-10-01)
- [x] Portada y página de producto (sesión anterior)
- [x] Cabecera: anuncio en español, sin selectores de país/idioma
- [x] Pie: marca CasaZen + texto, menú "Tienda", políticas, sin newsletter ni redes falsas, sin "Powered by Shopify"
- [x] Colores globales del tema (carrito, botones, formularios) alineados a la marca
- [x] Favicon (cz-favicon.svg)

## Pendiente del lado del usuario
- [ ] Cambiar nombre de la tienda "Mi tienda" → "CasaZen" (Configuración → Detalles de la tienda)
- [ ] Pegar políticas de envíos, devoluciones y términos (`politicas/`) — sin permiso `write_legal_policies`
- [ ] Añadir reseñas reales y fotos de antes/después cuando existan (editor del tema)
- [ ] Publicar el tema (Tienda online → Temas → CasaZen v1 → Publicar) — el conector no puede publicar
- [ ] (Opcional) Logo en imagen y redes sociales reales
