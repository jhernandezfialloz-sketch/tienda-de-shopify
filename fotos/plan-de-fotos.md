# Plan de fotos — CasaZen v2

Dirección de arte común (todas las fotos):
- Producto REAL (se parte de sus fotos de catálogo como referencia), sin texto, sin logos, sin iconos ni flechas.
- Luz natural suave de ventana lateral, sombras largas y difusas, misma hora del día en todo el set.
- Paleta: crema #F6F1EA, arena #ECE3D7, salvia #5F6F55, toques terracota #B5654A; materiales: lino, travertino, cerámica mate, madera clara, hojas de eucalipto.
- Encuadre con "aire" en el lado donde el bloque coloca el texto. Sin personas con rostro reconocible (solo manos/espalda/piel en primer plano).

| Bloque | Formato | Foto |
|---|---|---|
| Portada · mosaico grande | 4:5 vertical | Espátula sobre bandeja de travertino, gota de agua, eucalipto; aire arriba |
| Portada · mosaico 2 | 1:1 | Masajeador con sus cabezales en fila sobre lino arena, cenital |
| Portada · mosaico 3 | 1:1 | Corrector de postura sobre tela salvia, ángulo 45° |
| Ritual Rostro (principal) | 1:1 | Manos usando la espátula sobre mejilla húmeda, primer plano |
| Ritual Rostro (al pasar el ratón) | 1:1 | Detalle macro de la punta de acero con gotas |
| Ritual Cuerpo (principal) | 1:1 | Masajeador sobre muslo con toalla de lino, luz cálida |
| Ritual Cuerpo (hover) | 1:1 | Los cuatro cabezales en composición geométrica |
| Ritual Postura (principal) | 1:1 | Espalda con camiseta ligera y el dispositivo, persona sentada ante escritorio claro |
| Ritual Postura (hover) | 1:1 | Dispositivo junto a laptop y taza cerámica, bodegón |
| Comparar | 16:9 | Rincón de baño/dormitorio sereno con los 3 productos, aire central |
| Garantía | 1:1 | Caja/empaque abierto con producto envuelto en papel de seda |
| Cierre | 21:9 | Bodegón amplio de los 3 productos, mucho aire en el centro para el título |
| Galería de producto (×5 por producto) | 1:1 | Frontal fondo crema · 3/4 · detalle · en uso · con accesorios incluidos |

Modelo: OpenAI gpt-image (edición con las fotos de catálogo como referencia, para que el producto sea el real).

## Generación (listo para ejecutar)
- Referencias del catálogo descargadas en `fotos-originales/` (espátula, masajeador, postura).
- 27 fotos definidas en `fotos/prompts.json` (12 de secciones + 5 de galería por producto).
- Ejecutar: `node fotos/generar-todas.mjs` (lee `OPENAI_API_KEY` del entorno). Guarda en `fotos/generadas/`.
  Prueba barata primero: `node fotos/generar-todas.mjs --calidad low --solo zv-hero-1,zv-hero-2`.
- Gasto estimado: ~1,5–2 $ (todas medium, hero en high).
