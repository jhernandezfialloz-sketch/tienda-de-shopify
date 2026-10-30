import { db } from "@/lib/db";

/** Elimina TODOS los datos demo (is_demo = true) en una sola transacción. No toca datos reales. */
async function main() {
  const counts = await db.$transaction(async (tx) => {
    // Permiso puntual para borrar movimientos demo (el trigger bloquea cualquier otro borrado).
    await tx.$executeRaw`SELECT set_config('telos.allow_demo_purge', 'on', true)`;
    const demoVariants = (await tx.productVariant.findMany({ where: { isDemo: true }, select: { id: true } })).map((v) => v.id);
    const realSalesWithDemo = await tx.saleItem.count({ where: { variantId: { in: demoVariants }, sale: { isDemo: false } } });
    if (realSalesWithDemo > 0) throw new Error("Hay ventas reales que usan productos demo; no se borra nada. Revísalas primero.");
    const payments = await tx.payment.deleteMany({ where: { isDemo: true } });
    const sales = await tx.sale.deleteMany({ where: { isDemo: true } });
    const purchases = await tx.purchase.deleteMany({ where: { isDemo: true } });
    const movements = await tx.inventoryMovement.deleteMany({ where: { isDemo: true } });
    await tx.inventory.deleteMany({ where: { variantId: { in: demoVariants } } });
    await tx.productVariant.deleteMany({ where: { isDemo: true } });
    const products = await tx.product.deleteMany({ where: { isDemo: true } });
    const customers = await tx.customer.deleteMany({ where: { isDemo: true } });
    const suppliers = await tx.supplier.deleteMany({ where: { isDemo: true } });
    await tx.notification.deleteMany({ where: { isDemo: true } });
    await tx.socialMetric.deleteMany({ where: { isDemo: true } });
    await tx.marketingExpense.deleteMany({ where: { isDemo: true } });
    await tx.category.deleteMany({ where: { code: "DEM", products: { none: {} } } });
    return { products: products.count, sales: sales.count, purchases: purchases.count, movements: movements.count, payments: payments.count, customers: customers.count, suppliers: suppliers.count };
  });
  console.log("✓ Datos demo eliminados:", counts);
  console.log("  (audit_logs se conserva: es el historial de lo que ocurrió.)");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
