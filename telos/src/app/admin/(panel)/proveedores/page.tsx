import { formatHNL, toCents } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { listSuppliers } from "@/server/services/parties";
import { createSupplierAction } from "@/server/actions/parties";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader, Section } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { QuickCreate } from "@/components/admin/quick-create";

export const metadata = { title: "Proveedores" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("suppliers:read");
  const sp = await searchParams;
  const suppliers = await listSuppliers(sp.q);
  return (
    <>
      <PageHeader eyebrow="Comprar" title="Proveedores" />
      {can(user.role, "suppliers:write") && (
        <Section title="Nuevo proveedor" className="mb-6">
          <QuickCreate
            action={createSupplierAction}
            submitLabel="Crear proveedor"
            fields={[
              { name: "name", label: "Nombre", required: true },
              { name: "company", label: "Empresa" },
              { name: "whatsapp", label: "WhatsApp" },
              { name: "email", label: "Correo", type: "email" },
              { name: "leadTimeDays", label: "Entrega (días)", type: "number" },
            ]}
          />
        </Section>
      )}
      <form className="mb-4"><Input name="q" defaultValue={sp.q} placeholder="Buscar proveedor" aria-label="Buscar" /></form>
      {suppliers.length === 0 ? (
        <EmptyState title="No hay proveedores registrados." />
      ) : (
        <Table>
          <thead><tr><Th>Proveedor</Th><Th>Contacto</Th><Th className="text-right">Entrega</Th><Th className="text-right">Compras recibidas</Th><Th className="text-right">Total comprado</Th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <Td><span className="font-medium">{s.name}</span>{s.company && <span className="block text-xs text-muted">{s.company}</span>}</Td>
                <Td className="text-muted">{[s.whatsapp ?? s.phone, s.email].filter(Boolean).join(" · ") || "—"}</Td>
                <Td className="num text-right">{s.leadTimeDays != null ? `${s.leadTimeDays} d` : "—"}</Td>
                <Td className="num text-right">{s.purchases.length}</Td>
                <Td className="num text-right">{formatHNL(s.purchases.reduce((a, p) => a + toCents(p.total), 0))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
