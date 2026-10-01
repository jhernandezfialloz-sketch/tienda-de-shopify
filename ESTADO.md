# ESTADO del proyecto — CasaZen

## Borrador nuevo: CasaZen v2 (recomendado)
- Tema: **CasaZen v2** — gid://shopify/OnlineStoreTheme/192067207456 (SIN publicar)
- Vista previa: https://h83add-wh.myshopify.com/?preview_theme_id=192067207456
- Estilo: editorial. Fraunces (títulos, cursiva en el final) + DM Sans. Paleta: crema #F6F1EA,
  arena #ECE3D7, tinta #221C18, gris #6E6259, salvia #5F6F55, salvia suave #DDE3D5, terracota #B5654A.
- Secciones nuevas (prefijo `zv-`): hero (mosaico de 3 productos + sello), franja (texto en
  movimiento), rituales (un bloque por producto con compra directa), comparar (spa vs casa),
  garantia (sello giratorio), cierre, productos (tarjetas con compra rápida), producto (galería
  deslizable, modelos en botones, cantidad, % descuento, pestañas, barra de compra fija).
- Reutiliza cz-resenas, cz-antes-despues y cz-faq, que heredan los colores de v2 (variables --cz-* en body).
- `layout/theme.liquid` carga zv-styles.css, zv-scripts.js y cz-scripts.js en todas las páginas.
- Fotos IA (2026-10-01): 27 fotos gpt-image-2 (edición con fotos reales de referencia), en `fotos/generadas/`.
  - 12 en Archivos de Shopify (`shopify://shop_images/casazen-*.jpg`) asignadas a portada, rituales,
    comparar, garantía y cierre.
  - 15 en los productos (5 c/u, alt empieza por "CasaZen –"), movidas a las posiciones 1-5.
    La galería zv-producto muestra solo fotos con "CasaZen" en el alt (ajuste `media_tag`);
    las fotos originales siguen en el producto.
- Animaciones: cortina (zv-mask), parallax (data-zv-par), títulos palabra a palabra (zv-split),
  botones con relleno. Respetan "reducir movimiento".
- Bloque "Paso a paso" (zv-uso): pestañas Rostro/Cuerpo/Postura, 9 fotos de la misma persona (casazen-uso-*.jpg), entre rituales y comparar. Muestra cómo se usa, no resultados.
- Pagos (2026-10-01): dropshipping → SIN contra entrega. Método real: transferencia BAC (manual). La 'Pasarela de pago de prueba' está activa solo para pruebas: desactivar antes de abrir. Textos v2: 'Compra 100% segura' + FAQ/pestaña explican transferencia BAC y 'pronto con tarjeta'. Pendiente: CyberSource vía BAC.
- Pendiente: revisión visual (tienda con contraseña; pedir contraseña para revisar la vista previa).

## Borrador anterior: CasaZen v1

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
