import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { createProduct } from "@/server/services/products";
import { addProductImage } from "@/server/services/images";
import { ownerActor } from "./_actor";

/**
 * Inventario inicial REAL a partir de las fotografías enviadas por el dueño (2026-10-30).
 * Regla: no se inventa nada. Talla, precio, costo, stock, composición y autenticidad
 * quedan "PENDIENTE DE CONFIRMAR". Todo se crea en BORRADOR (no visible en la web).
 * Detalle del análisis: docs/INVENTARIO-INICIAL.md
 */
const P = "PENDIENTE DE CONFIRMAR";

interface Seed {
  category: "CMT" | "GOR";
  name: string;
  brand?: string;
  color: string;
  description: string;
  notes: string;
  photos: string[];
}

const SEEDS: Seed[] = [
  {
    category: "CMT",
    name: "Camiseta AllSaints Spitalfields blanca",
    brand: "AllSaints",
    color: "Blanco",
    description: "Camiseta manga corta, cuello redondo. Estampado negro “ALLSAINTS / SPITALFIELDS” en el pecho izquierdo. Con etiquetas colgantes.",
    notes: `${P}: talla, precio, costo, stock, composición y autenticidad/proveedor. Marca según estampado y etiquetas visibles. Confirmar si la foto de espalda (“SEND ME A POSTCARD · LONDON”) es de esta misma camiseta.`,
    photos: ["cmt-allsaints-spitalfields-blanca-frente.jpg", "cmt-allsaints-postcard-blanca-espalda.jpg"],
  },
  {
    category: "CMT",
    name: "Camiseta AllSaints London negra",
    brand: "AllSaints",
    color: "Negro",
    description: "Camiseta manga corta, cuello redondo. Estampado blanco “ALLSAINTS / LONDON” en el pecho izquierdo. Etiqueta interior AllSaints y etiquetas colgantes.",
    notes: `${P}: talla, precio, costo, stock, composición y autenticidad/proveedor. Confirmar si la foto de espalda (“SEND ME A POSTCARD · LONDON”) es de esta misma camiseta.`,
    photos: ["cmt-allsaints-london-negra-frente.jpg", "cmt-allsaints-postcard-negra-espalda.jpg"],
  },
  {
    category: "CMT",
    name: "Camiseta BOSS azul marino con puntos",
    brand: "BOSS",
    color: "Azul marino",
    description: "Camiseta manga corta, cuello redondo con cinta de rayas. Logo “BOSS” blanco y tres puntos (negro, blanco, rojo-naranja) al frente; franjas negro/beige/blanco en las mangas; monograma “B” en la nuca.",
    notes: `${P}: talla, precio, costo, stock, composición y autenticidad/proveedor. Falta subir la foto frontal (no llegó como archivo).`,
    photos: ["cmt-boss-marino-espalda.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra negra calavera de pedrería",
    color: "Negro",
    description: "Gorra negra de 6 paneles. Calavera con pedrería y letras góticas al frente, mano de esqueleto bordada en 3D en la visera, botón superior metálico y pin con cruz de piedras.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material. Texto gótico del frente no legible en la foto. Falta subir la foto (no llegó como archivo).`,
    photos: [],
  },
  {
    category: "GOR",
    name: "Gorra negra D gótica cromada",
    color: "Negro",
    description: "Gorra negra. Letra “D” gótica en placa cromada plateada al frente, flores delineadas con pedrería a ambos lados, apliques cromados tribales en la visera y murciélagos cromados en los laterales.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material. Falta subir la foto.`,
    photos: [],
  },
  {
    category: "GOR",
    name: "Gorra negra flor morada",
    color: "Negro",
    description: "Gorra negra con textura de murciélagos en relieve. Flor bordada negra y lila con cara cosida al centro, flores delineadas en blanco/lila a los lados y murciélago lila bordado en la visera.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material. Falta subir la foto.`,
    photos: [],
  },
  {
    category: "GOR",
    name: "Gorra negra LA nubes y rayos",
    color: "Negro",
    description: "Gorra negra. Letras “LA” en bordado 3D blanco tipo nube, rayos bordados en blanco y azul, nubes 3D y parche lateral.",
    notes: `${P}: marca, licencia del monograma, ajuste/talla, precio, costo, stock y material. Falta subir la foto.`,
    photos: [],
  },
  {
    category: "GOR",
    name: "Gorra negra D gótica negra",
    color: "Negro",
    description: "Gorra negra. Letra “D” gótica en placa cromada negra/grafito, sol de pedrería negra, apliques tribales negros brillantes en la visera y ojos cromados en el lateral.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material. Falta subir la foto.`,
    photos: [],
  },
  {
    category: "GOR",
    name: "Gorra negra LA nubes y billetes",
    color: "Negro",
    description: "Gorra negra. Letras “LA” en bordado 3D blanco tipo nube, nubes 3D y parches de billetes; bordado lateral.",
    notes: `${P}: marca, licencia del monograma, ajuste/talla, precio, costo, stock y material. Falta subir la foto.`,
    photos: [],
  },
  {
    category: "GOR",
    name: "Gorra azul marino NY nubes",
    color: "Azul marino",
    description: "Gorra azul marino. Letras “NY” en bordado 3D blanco tipo nube con contorno negro, nubes 3D; bordados laterales en blanco y turquesa.",
    notes: `${P}: marca, licencia del monograma, ajuste/talla, precio, costo, stock y material. Falta subir la foto.`,
    photos: [],
  },
];

async function main() {
  const actor = await ownerActor();
  const categories = Object.fromEntries((await db.category.findMany()).map((c) => [c.code, c.id]));
  for (const seed of SEEDS) {
    if (!categories[seed.category]) throw new Error(`Falta la categoría ${seed.category}: corre primero npm run db:seed`);
    if (await db.product.findFirst({ where: { name: seed.name } })) {
      console.log(`· ya existe: ${seed.name}`);
      continue;
    }
    const product = await createProduct(actor, {
      name: seed.name,
      categoryId: categories[seed.category],
      brand: seed.brand,
      description: seed.description,
      internalNotes: seed.notes,
      status: "DRAFT",
      variants: [{ color: seed.color }],
    });
    for (const photo of seed.photos) {
      const buf = await readFile(path.join(process.cwd(), "fotos-productos", photo));
      await addProductImage(actor, product.id, new File([buf], photo, { type: "image/jpeg" }));
    }
    console.log(`✓ ${product.code}  ${seed.name}  (${seed.photos.length} foto/s)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
