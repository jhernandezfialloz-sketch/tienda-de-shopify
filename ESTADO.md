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
- Contacto (2026-10-03): a pedido del dueño se QUITARON teléfono y correo de la web (pie, FAQ, producto, página Contacto). Solo formulario de contacto + 'Tegucigalpa, Honduras'. Botón WhatsApp (zv-whatsapp) apagado y sin número; se reactiva desde el editor. Entrega ~12 días.
- Envíos (2026-10-04): TODO EL MUNDO. Mercado 'Resto del mundo' (~210 países; excluidos CU, IR, KP, SY, RU, BY, AF, IQ, LY, SD, SS, SO, YE, ER, MM, PS, EH, XK por sanciones/sin servicio) + zona 'Resto del mundo' (restOfWorld) gratis 15–25 días en ambos perfiles. Textos web: 'Envío gratis a todo el mundo'. Zen Glow (2026-10-04): REEMPLAZADO. Windaily ya no disponible; se importó por AutoDS el proveedor MERALL (aliexpress 1005007346452334, variante 'Black With Box', ~$11.42, envío gratis ~13 días) como producto nuevo Shopify 15407280849184, handle 'zen-glow-espatula-ultrasonica-facial', título 'Zen Glow – Espátula ultrasónica facial 3 en 1' (el modelo MERALL tiene 3 modos: limpieza, hidratación, lifting), variante 'Negro' L1199 (antes L2099), fotos CasaZen primero. Tema actualizado (hero, rituales, uso, 'mas'). Producto viejo 15403469046048 ARCHIVADO (proveedor AutoDS Marketplace solo enviaba a HN).
- Envíos (2026-10-03): Honduras + Centroamérica (GT, SV, NI, CR, PA), ENVÍO GRATIS sin mínimo en ambos perfiles ('AutoDS Free Shipping' y 'Perfil general'). Zona HN: ~12 días; zona Centroamérica: 12 a 18 días. Mercado 'Centroamérica' creado en Shopify (moneda HNL, sin conversión local). Textos web: 'Envío gratis a Honduras y Centroamérica · Llega en 12 a 18 días'. Belice no incluido. OJO: Zen Glow viene de AutoDS Marketplace con ship_to_region=US; confirmar en AutoDS que el proveedor envía a HN/Centroamérica.
- Reseñas (cz-resenas) OCULTAS ("disabled": true) en portada y producto hasta tener reseñas reales.
- Antes/después enviados por el dueño (2026-10-03) NO usados: eran de otras tiendas (marca de agua, producto distinto) → engañoso y derechos de autor. Sección vacía hasta tener fotos reales con permiso.
- Pendiente: revisión visual (tienda con contraseña; pedir contraseña para revisar la vista previa).

## Borrador anterior: CasaZen v1

- Tienda: h83add-wh.myshopify.com (país Honduras, moneda HNL)
- Tema de trabajo: **CasaZen v1** — gid://shopify/OnlineStoreTheme/192066486560 (SIN publicar)
- Tema en vivo: Horizon (gid://shopify/OnlineStoreTheme/191910379808)
- Vista previa: https://h83add-wh.myshopify.com/?preview_theme_id=192066486560
- Cómo se edita: Admin API (`themeFilesUpsert`) desde el conector de Shopify; las
  escrituras solo se permiten en temas NO publicados.

## Productos (renombrados 2026-10-03, títulos + descripción + SEO)
1. Zen Glow – Espátula ultrasónica facial 4 en 1 — L 1,199
2. Zen Sculpt – Masajeador corporal con cabezales intercambiables — L 1,899 (enchufe en fotos del proveedor parece europeo: VERIFICAR)
3. Zen Align – Corrector de postura inteligente — L 849 / L 1,099 (Type B / Type A)
(handles sin cambiar; las plantillas los usan)
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
