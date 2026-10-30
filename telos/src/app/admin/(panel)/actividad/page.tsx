import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/current";
import { PageHeader, Pagination, Section } from "@/components/ui/layout";
import { ActivityList } from "@/components/admin/activity-list";

export const metadata = { title: "Actividad" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser("audit:read");
  const page = Math.max(Number((await searchParams).page) || 1, 1);
  const pageSize = 50;
  const [total, entries] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { user: { select: { name: true } } } }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Sistema" title="Actividad y auditoría">
        <p className="mt-1 text-sm text-muted">Quién hizo qué y cuándo. Los valores anteriores y nuevos quedan guardados en audit_logs.</p>
      </PageHeader>
      <Section><ActivityList entries={entries} /></Section>
      <Pagination page={page} pageSize={pageSize} total={total} params={{}} />
    </>
  );
}
