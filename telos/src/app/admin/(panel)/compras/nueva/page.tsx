import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/layout";
import { PurchaseForm } from "@/components/admin/purchase-form";

export const metadata = { title: "Nueva compra" };

export default async function NewPurchasePage() {
  await requireUser("purchases:write");
  const suppliers = await db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader eyebrow="Comprar" title="Nueva compra" />
      <PurchaseForm suppliers={suppliers} />
    </>
  );
}
