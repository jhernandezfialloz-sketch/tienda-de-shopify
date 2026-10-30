import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { PageHeader } from "@/components/ui/layout";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const user = await requireUser("products:write");
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, code: true } });
  return (
    <>
      <PageHeader eyebrow="Productos" title="Nuevo producto" />
      <ProductForm productId={null} categories={categories} canAdjustStock={can(user.role, "inventory:adjust")} />
    </>
  );
}
