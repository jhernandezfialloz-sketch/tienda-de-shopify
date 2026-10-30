import { formatDate } from "@/lib/dates";
import { formatHNL, toCents } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { listCustomers } from "@/server/services/parties";
import { createCustomerAction } from "@/server/actions/parties";
import { Input } from "@/components/ui/form";
import { EmptyState, PageHeader, Section } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { QuickCreate } from "@/components/admin/quick-create";

export const metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("customers:read");
  const sp = await searchParams;
  const customers = await listCustomers(sp.q);
  const finance = can(user.role, "finance:read") || can(user.role, "sales:read");

  return (
    <>
      <PageHeader eyebrow="Vender" title="Clientes" />
      {can(user.role, "customers:write") && (
        <Section title="Nuevo cliente" className="mb-6">
          <QuickCreate
            action={createCustomerAction}
            submitLabel="Crear cliente"
            fields={[
              { name: "name", label: "Nombre", required: true },
              { name: "phone", label: "Teléfono / WhatsApp" },
              { name: "city", label: "Ciudad" },
              { name: "email", label: "Correo", type: "email" },
              { name: "acquisitionSource", label: "¿Cómo nos conoció?" },
            ]}
          />
        </Section>
      )}
      <form className="mb-4"><Input name="q" defaultValue={sp.q} placeholder="Buscar por nombre, teléfono o correo" aria-label="Buscar" /></form>
      {customers.length === 0 ? (
        <EmptyState title="No hay clientes registrados." body="Los clientes también se crean desde el formulario de venta." />
      ) : (
        <Table>
          <thead><tr><Th>Nombre</Th><Th>Contacto</Th><Th className="text-right">Pedidos</Th>{finance && <Th className="text-right">Total comprado</Th>}{finance && <Th className="hidden text-right sm:table-cell">Ticket prom.</Th>}<Th className="hidden md:table-cell">Última compra</Th></tr></thead>
          <tbody>
            {customers.map((c) => {
              const total = c.sales.reduce((s, x) => s + toCents(x.total), 0);
              const last = c.sales.reduce<Date | null>((d, x) => (!d || x.soldAt > d ? x.soldAt : d), null);
              return (
                <tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td className="text-muted">{[c.phone, c.city].filter(Boolean).join(" · ") || "—"}</Td>
                  <Td className="num text-right">{c.sales.length}</Td>
                  {finance && <Td className="num text-right">{formatHNL(total)}</Td>}
                  {finance && <Td className="num hidden text-right sm:table-cell">{c.sales.length ? formatHNL(Math.round(total / c.sales.length)) : "—"}</Td>}
                  <Td className="hidden text-muted md:table-cell">{formatDate(last)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
