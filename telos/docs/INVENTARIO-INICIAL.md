# Inventario inicial a partir de fotografías (2026-10-30)

Fuente: 13 fotografías enviadas por el dueño. Regla aplicada: **no inventar**.
Todo lo que no se ve en la foto queda como **PENDIENTE DE CONFIRMAR**.
Los 10 productos se cargan con `npm run seed:inventario-inicial`, en estado
**Borrador** (no visibles en la web), con stock 0 y sin precio ni costo.

Las 13 fotos están en `fotos-productos/` y el script las adjunta a cada producto
(la primera de la lista es la portada). Volver a correrlo no duplica fotos.

## Camisetas (categoría CMT)

| Código | Nombre interno | Color | Lo que se ve | Fotos | Pendiente de confirmar |
|---|---|---|---|---|---|
| TLS-CMT-001 | Camiseta AllSaints Spitalfields blanca | Blanco | Manga corta, cuello redondo; estampado negro "ALLSAINTS / SPITALFIELDS" en el pecho izquierdo; etiquetas colgantes verde oliva y blanca | Frente · espalda | Talla, precio, costo, stock, composición, proveedor |
| TLS-CMT-002 | Camiseta AllSaints London negra | Negro | Manga corta, cuello redondo; estampado blanco "ALLSAINTS / LONDON" en el pecho izquierdo; etiqueta interior AllSaints; etiquetas colgantes | Frente · espalda | Ídem |
| TLS-CMT-003 | Camiseta BOSS azul marino con puntos | Azul marino | Logo "BOSS" blanco y tres puntos (negro, blanco, rojo-naranja) al frente; franjas negro/beige/blanco en las mangas; cinta de rayas en el cuello; monograma "B" en la nuca | Frente · espalda | Ídem |

Las espaldas "ALLSAINTS / SEND ME A POSTCARD / LONDON" son de las mismas camisetas
(confirmado por el dueño, 2026-10-30).

## Gorras (categoría GOR)

Ninguna gorra muestra la marca de forma legible → marca **PENDIENTE DE CONFIRMAR** en todas.

| Código | Nombre interno | Color | Lo que se ve |
|---|---|---|---|
| TLS-GOR-001 | Gorra negra calavera de pedrería | Negro | Calavera con pedrería y letras góticas (texto ilegible), mano de esqueleto bordada en 3D en la visera, botón metálico, pin con cruz de piedras |
| TLS-GOR-002 | Gorra negra D gótica cromada | Negro | "D" gótica en placa cromada plateada, flores delineadas con pedrería, apliques tribales cromados en la visera, murciélagos cromados laterales |
| TLS-GOR-003 | Gorra negra flor morada | Negro | Tela con murciélagos en relieve, flor negra/lila con cara cosida, flores delineadas blanco/lila, murciélago lila en la visera |
| TLS-GOR-004 | Gorra negra LA nubes y rayos | Negro | "LA" en bordado 3D tipo nube, rayos blanco/azul, nubes 3D, parche lateral |
| TLS-GOR-005 | Gorra negra D gótica negra | Negro | "D" gótica en placa cromada negra/grafito, sol de pedrería negra, apliques tribales negros en la visera, ojos cromados laterales |
| TLS-GOR-006 | Gorra negra LA nubes y billetes | Negro | "LA" en bordado 3D tipo nube, nubes y parches de billetes, bordado lateral |
| TLS-GOR-007 | Gorra azul marino NY nubes | Azul marino | "NY" en bordado 3D tipo nube con contorno negro, nubes 3D, bordados laterales blanco/turquesa |

Pendiente en todas: marca, ajuste/talla (snapback, strapback o cerrada), precio, costo, stock y material.

## Autenticidad (respuesta del dueño, 2026-10-30)

Las camisetas con logotipos **AllSaints** y **BOSS** (TLS-CMT-001 a 003) y las gorras con
monogramas **LA** y **NY** (TLS-GOR-004, 006 y 007) **no son producto original**.

- En el sistema quedan sin marca, en **Borrador**, con la nota "NO ORIGINAL" en sus notas internas.
- Vender como originales, o anunciar, prendas con marcas registradas de terceros que no lo son
  es falsificación de marca: hay riesgo legal (decomiso, multas) y las redes sociales y
  marketplaces eliminan esas publicaciones y pueden cerrar la cuenta.
- TELOS no publicará estos productos en el sitio web ni en materiales de marketing.

## Tallas

Cuando sepas qué tallas tienes de cada producto, abre el producto → "+ Varias tallas" y
luego registra el stock en Inventario (tipo "Inventario inicial").
