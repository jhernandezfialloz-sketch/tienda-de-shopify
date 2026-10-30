import { notFound } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatHNL } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { getPurchase } from "@/server/services/purchases";
import { PURCHASE_TRANSITIONS, PURCHASE_STATUS_LABELS } from "@/server/services/purchase-rules";
import { transitionPurchaseAction } from "@/server/actions/purchases";
import { PageHeader, Section, Stat } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { PurchaseStatusBadge } from "@/components/admin/status";
import { TransitionButton } from "@/components/admin/transition-button";

export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("purchases:read");
  const { id } = await params;
  const p = await getPurchase(id);
  if (!p) notFound();
  const next = PURCHASE_TRANSITIONS[p.status];

  return (
    <>
      <PageHeader
        eyebrow={`Compra · ${p.supplier?.name ?? "sin proveedor"}`}
        title={p.code}
        actions={next.map((to) => {
          const allowed = can(user.role, to === "RECIBIDA" ? "purchases:receive" : "purchases:write");
          if (!allowed) return null;
          const action = async () => {
            "use server";
            return transitionPurchaseAction(p.id, to);
          };
          return (
            <TransitionButton
              key={to}
              variant={to === "RECIBIDA" ? "primary" : to === "CANCELADA" ? "danger" : "secondary"}
              label={to === "RECIBIDA" ? "Marcar recibida (suma inventario)" : `Marcar ${PURCHASE_STATUS_LABELS[to].toLowerCase()}`}
              confirmText={to === "RECIBIDA" ? "Se sumarán las unidades al inventario y se recalculará el costo. Esta acción no se puede deshacer. ¿Continuar?" : undefined}
              action={action}
            />
          );
        })}
      >
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <PurchaseStatusBadge status={p.status} />
          <span>Fecha {formatDate(p.orderedAt)}</span>
          {p.receivedAt && <span>· recibida {formatDateTime(p.receivedAt)}</span>}
          {p.createdBy && <span>· registró {p.createdBy.name}</span>}
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 rounded-lg border border-line bg-surface sm:grid-cols-5">
        <Stat label="Mercancía" value={formatHNL(p.subtotal)} />
        <Stat label="Transporte" value={formatHNL(p.shippingCost)} />
        <Stat label="Impuestos" value={formatHNL(p.taxes)} />
        <Stat label="Otros" value={formatHNL(p.otherCosts)} />
        <Stat label="Total" value={formatHNL(p.total)} note={p.paymentMethod ?? undefined} />
      </div>

      <Section title="Productos">
        <Table>
          <thead><tr><Th>SKU</Th><Th>Producto</Th><Th className="text-right">Cant.</Th><Th className="text-right">Costo unit.</Th><Th className="text-right">Costo real unit.</Th></tr></thead>
          <tbody>
            {p.items.map((i) => (
              <tr key={i.id}>
                <Td className="num">{i.variant.sku}</Td>
                <Td>{i.variant.product.name}</Td>
                <Td className="num text-right">{i.quantity}</Td>
                <Td className="num text-right">{formatHNL(i.unitCost)}</Td>
                <Td className="num text-right">{i.landedUnitCost ? formatHNL(i.landedUnitCost) : <span className="text-muted">Al recibir</span>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {p.notes && <p className="mt-3 text-sm text-muted">{p.notes}</p>}
      </Section>
    </>
  );
}
