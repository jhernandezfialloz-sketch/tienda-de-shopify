import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { createProduct } from "@/server/services/products";
import { addProductImage, setCoverImage } from "@/server/services/images";
import { slugify } from "@/lib/slug";
import { ownerActor } from "./_actor";

/**
 * Inventario inicial REAL a partir de las fotografías enviadas por el dueño (2026-10-30).
 * Regla: no se inventa nada. Talla, precio, costo, stock, composición y autenticidad
 * quedan "PENDIENTE DE CONFIRMAR". Todo se crea en BORRADOR (no visible en la web).
 * Detalle del análisis: docs/INVENTARIO-INICIAL.md
 */
const P = "PENDIENTE DE CONFIRMAR";
// Respuesta del dueño (2026-10-30): las prendas con marcas de terceros NO son originales.
const NOT_AUTHENTIC = "NO ORIGINAL (confirmado por el dueño, 2026-10-30): lleva logotipos de una marca registrada de terceros sin ser producto original. No publicar ni anunciar.";

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
    color: "Blanco",
    description: "Camiseta manga corta, cuello redondo. Estampado negro “ALLSAINTS / SPITALFIELDS” en el pecho izquierdo. Con etiquetas colgantes.",
    notes: `${NOT_AUTHENTIC} ${P}: talla, precio, costo, stock, composición y proveedor.`,
    photos: ["cmt-allsaints-spitalfields-blanca-frente.jpg", "cmt-allsaints-postcard-blanca-espalda.jpg"],
  },
  {
    category: "CMT",
    name: "Camiseta AllSaints London negra",
    color: "Negro",
    description: "Camiseta manga corta, cuello redondo. Estampado blanco “ALLSAINTS / LONDON” en el pecho izquierdo. Etiquetas interior y colgantes con la marca.",
    notes: `${NOT_AUTHENTIC} ${P}: talla, precio, costo, stock, composición y proveedor.`,
    photos: ["cmt-allsaints-london-negra-frente.jpg", "cmt-allsaints-postcard-negra-espalda.jpg"],
  },
  {
    category: "CMT",
    name: "Camiseta BOSS azul marino con puntos",
    color: "Azul marino",
    description: "Camiseta manga corta, cuello redondo con cinta de rayas. Logo “BOSS” blanco y tres puntos (negro, blanco, rojo-naranja) al frente; franjas negro/beige/blanco en las mangas; monograma “B” en la nuca.",
    notes: `${NOT_AUTHENTIC} ${P}: talla, precio, costo, stock, composición y proveedor.`,
    photos: ["cmt-boss-marino-frente.jpg", "cmt-boss-marino-espalda.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra negra calavera de pedrería",
    color: "Negro",
    description: "Gorra negra de 6 paneles. Calavera con pedrería y letras góticas al frente, mano de esqueleto bordada en 3D en la visera, botón superior metálico y pin con cruz de piedras.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material. Texto gótico del frente no legible en la foto.`,
    photos: ["gor-calavera-pedreria-negra.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra negra D gótica cromada",
    color: "Negro",
    description: "Gorra negra. Letra “D” gótica en placa cromada plateada al frente, flores delineadas con pedrería a ambos lados, apliques cromados tribales en la visera y murciélagos cromados en los laterales.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material.`,
    photos: ["gor-d-gotica-cromada-negra.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra negra flor morada",
    color: "Negro",
    description: "Gorra negra con textura de murciélagos en relieve. Flor bordada negra y lila con cara cosida al centro, flores delineadas en blanco/lila a los lados y murciélago lila bordado en la visera.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material.`,
    photos: ["gor-flor-morada-negra.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra negra LA nubes y rayos",
    color: "Negro",
    description: "Gorra negra. Letras “LA” en bordado 3D blanco tipo nube, rayos bordados en blanco y azul, nubes 3D y parche lateral.",
    notes: `${NOT_AUTHENTIC} ${P}: ajuste/talla, precio, costo, stock y material.`,
    photos: ["gor-la-nubes-rayos-negra.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra negra D gótica negra",
    color: "Negro",
    description: "Gorra negra. Letra “D” gótica en placa cromada negra/grafito, sol de pedrería negra, apliques tribales negros brillantes en la visera y ojos cromados en el lateral.",
    notes: `${P}: marca, ajuste/talla, precio, costo, stock y material.`,
    photos: ["gor-d-gotica-negra-tres-cuartos.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra negra LA nubes y billetes",
    color: "Negro",
    description: "Gorra negra. Letras “LA” en bordado 3D blanco tipo nube, nubes 3D y parches de billetes; bordado lateral.",
    notes: `${NOT_AUTHENTIC} ${P}: ajuste/talla, precio, costo, stock y material.`,
    photos: ["gor-la-nubes-billetes-negra.jpg"],
  },
  {
    category: "GOR",
    name: "Gorra azul marino NY nubes",
    color: "Azul marino",
    description: "Gorra azul marino. Letras “NY” en bordado 3D blanco tipo nube con contorno negro, nubes 3D; bordados laterales en blanco y turquesa.",
    notes: `${NOT_AUTHENTIC} ${P}: ajuste/talla, precio, costo, stock y material.`,
    photos: ["gor-ny-nubes-marino.jpg"],
  },
];

const MISSING_PHOTO_NOTE = / Falta subir la foto[^.]*\./g;

/** Sube las fotos del seed que el producto aún no tiene (reconoce el archivo por su nombre en la clave). */
async function syncPhotos(actor: Awaited<ReturnType<typeof ownerActor>>, productId: string, photos: string[]) {
  const existing = await db.productImage.findMany({ where: { productId }, select: { storageKey: true } });
  let added = 0;
  for (const photo of photos) {
    const tag = slugify(photo.replace(/\.[^.]+$/, ""));
    if (existing.some((img) => img.storageKey.endsWith(`-${tag}.webp`))) continue;
    const buf = await readFile(path.join(process.cwd(), "fotos-productos", photo));
    await addProductImage(actor, productId, new File([buf], photo, { type: "image/jpeg" }));
    added++;
  }
  // La primera foto de la lista es la portada.
  const firstTag = photos[0] ? slugify(photos[0].replace(/\.[^.]+$/, "")) : null;
  if (added > 0 && firstTag) {
    const images = await db.productImage.findMany({ where: { productId } });
    const cover = images.find((img) => img.storageKey.endsWith(`-${firstTag}.webp`));
    if (cover && !cover.isCover) {
      await setCoverImage(actor, cover.id);
      const rest = images.filter((img) => img.id !== cover.id).sort((a, b) => a.position - b.position);
      for (const [i, img] of [cover, ...rest].entries()) await db.productImage.update({ where: { id: img.id }, data: { position: i } });
    }
  }
  return added;
}

async function main() {
  const actor = await ownerActor();
  const categories = Object.fromEntries((await db.category.findMany()).map((c) => [c.code, c.id]));
  for (const seed of SEEDS) {
    if (!categories[seed.category]) throw new Error(`Falta la categoría ${seed.category}: corre primero npm run db:seed`);
    const existing = await db.product.findFirst({ where: { name: seed.name } });
    if (existing) {
      const added = await syncPhotos(actor, existing.id, seed.photos);
      // Quitar el aviso "Falta subir la foto" de cargas anteriores (no toca otras notas).
      if (added > 0 && existing.internalNotes?.includes("Falta subir la foto")) {
        await db.product.update({ where: { id: existing.id }, data: { internalNotes: existing.internalNotes.replace(MISSING_PHOTO_NOTE, "") } });
      }
      console.log(`· ya existe: ${existing.code} ${seed.name}${added ? ` (+${added} foto/s)` : ""}`);
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
    const added = await syncPhotos(actor, product.id, seed.photos);
    console.log(`✓ ${product.code}  ${seed.name}  (${added} foto/s)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
