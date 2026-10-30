import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/layout";
import { SaleForm } from "@/components/admin/sale-form";

export const metadata = { title: "Nueva venta" };

export default async function NewSalePage() {
  await requireUser("sales:write");
  const customers = await db.customer.findMany({ orderBy: { name: "asc" }, take: 500, select: { id: true, name: true, phone: true } });
  return (
    <>
      <PageHeader eyebrow="Vender" title="Nueva venta" />
      <SaleForm customers={customers} />
    </>
  );
}
