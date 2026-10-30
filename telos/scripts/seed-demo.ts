import { db } from "@/lib/db";
import { createProduct } from "@/server/services/products";
import { createPurchase, transitionPurchase } from "@/server/services/purchases";
import { createSale, transitionSale } from "@/server/services/sales";
import { ownerActor } from "./_actor";

/**
 * Datos DEMO para probar el sistema. Todo queda marcado is_demo = true, con la
 * categoría "Demo" (códigos TLS-DEM-…) y el prefijo [DEMO] en los nombres.
 * Se eliminan por completo con: npm run demo:purge
 */
async function main() {
  const actor = await ownerActor();
  if (await db.product.count({ where: { isDemo: true } })) {
    console.log("Ya hay datos demo. Elimínalos primero con npm run demo:purge");
    return;
  }
  const category = await db.category.upsert({ where: { code: "DEM" }, update: {}, create: { name: "Demo", code: "DEM", slug: "demo", sortOrder: 99 } });
  const demo = { isDemo: true };

  const camisa = await createProduct(
    actor,
    {
      name: "[DEMO] Camisa Oxford azul",
      categoryId: category.id,
      minimumStock: 2,
      status: "ACTIVE",
      variants: ["S", "M", "L", "XL"].map((size) => ({ color: "Azul", size, price: "850", cost: "420", initialStock: 5 })),
    },
    demo,
  );
  const gorra = await createProduct(
    actor,
    { name: "[DEMO] Gorra negra lisa", categoryId: category.id, minimumStock: 3, status: "ACTIVE", variants: [{ color: "Negro", size: "Única", price: "450", cost: "180", initialStock: 8 }] },
    demo,
  );
  const variants = await db.productVariant.findMany({ where: { productId: { in: [camisa.id, gorra.id] } }, orderBy: { sku: "asc" } });
  const [gorraV, ...camisaV] = [variants.find((v) => v.productId === gorra.id)!, ...variants.filter((v) => v.productId === camisa.id)];

  const supplier = await db.supplier.create({ data: { name: "[DEMO] Proveedor San Pedro Sula", leadTimeDays: 7, isDemo: true } });
  const purchase = await createPurchase(
    actor,
    { supplierId: supplier.id, status: "ORDENADA", shippingCost: "300", items: [{ variantId: gorraV.id, quantity: 10, unitCost: "170" }] },
    demo,
  );
  await transitionPurchase(actor, purchase.id, "RECIBIDA");

  const customer = await db.customer.create({ data: { name: "[DEMO] Carlos Mejía", phone: "9999-0000", city: "Tegucigalpa", isDemo: true } });
  const s1 = await createSale(actor, { channel: "INSTAGRAM", customerId: customer.id, confirm: true, markPaid: true, paymentMethod: "Transferencia", items: [{ variantId: camisaV[1]!.id, quantity: 2 }, { variantId: gorraV.id, quantity: 1 }] }, demo);
  await transitionSale(actor, s1.id, "ENTREGADA");
  await createSale(actor, { channel: "WHATSAPP", newCustomer: { name: "[DEMO] Andrea López", city: "San Pedro Sula" }, confirm: true, items: [{ variantId: camisaV[2]!.id, quantity: 4 }] }, demo);
  await createSale(actor, { channel: "TIENDA", items: [{ variantId: gorraV.id, quantity: 2 }] }, demo);
  console.log("✓ Datos DEMO creados (2 productos, 1 compra recibida, 3 ventas). Elimínalos con npm run demo:purge");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
