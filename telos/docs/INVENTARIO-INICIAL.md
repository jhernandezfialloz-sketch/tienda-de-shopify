# Inventario inicial a partir de fotografías (2026-10-30)

Fuente: 13 fotografías enviadas por el dueño. Regla aplicada: **no inventar**.
Todo lo que no se ve en la foto queda como **PENDIENTE DE CONFIRMAR**.
Los 10 productos se cargan con `npm run seed:inventario-inicial`, en estado
**Borrador** (no visibles en la web), con stock 0 y sin precio ni costo.

> Archivos: solo 5 fotos llegaron como archivo (en `fotos-productos/`). Las otras 8
> (camiseta BOSS frontal y las 7 gorras) se vieron en la conversación, pero no hay
> archivo en disco. Súbelas desde la ficha de cada producto en Telos Admin.

## Camisetas (categoría CMT)

| Código | Nombre interno | Color | Lo que se ve | Fotos | Pendiente de confirmar |
|---|---|---|---|---|---|
| TLS-CMT-001 | Camiseta AllSaints Spitalfields blanca | Blanco | Manga corta, cuello redondo; estampado negro "ALLSAINTS / SPITALFIELDS" en el pecho izquierdo; etiquetas colgantes verde oliva y blanca | Frente ✓ · espalda ✓* | Talla, precio, costo, stock, composición, autenticidad/proveedor |
| TLS-CMT-002 | Camiseta AllSaints London negra | Negro | Manga corta, cuello redondo; estampado blanco "ALLSAINTS / LONDON" en el pecho izquierdo; etiqueta interior AllSaints; etiquetas colgantes | Frente ✓ · espalda ✓* | Ídem |
| TLS-CMT-003 | Camiseta BOSS azul marino con puntos | Azul marino | Logo "BOSS" blanco y tres puntos (negro, blanco, rojo-naranja) al frente; franjas negro/beige/blanco en las mangas; cinta de rayas en el cuello; monograma "B" en la nuca | Espalda ✓ · frente (sin archivo) | Ídem |

\* Las fotos de espalda dicen "ALLSAINTS / SEND ME A POSTCARD / LONDON" (blanca y negra).
Se asociaron a la camiseta del mismo color, pero **confirma que son la misma prenda** y
no un modelo distinto (el frente blanco dice "Spitalfields" y la espalda "London").

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

## Observaciones para el negocio

- **Marcas de terceros (AllSaints, BOSS):** la marca se registró tal como aparece en la prenda.
  Confirma el proveedor y la autenticidad antes de publicarlas en la web con esa marca.
- **Monogramas "LA" y "NY":** se parecen a logotipos de equipos de béisbol. Confirma con
  el proveedor si son productos con licencia antes de anunciarlos.
- **Tallas:** cuando sepas qué tallas tienes de cada camiseta, abre el producto → "+ Varias
  tallas" y luego registra el stock en Inventario (tipo "Inventario inicial").
