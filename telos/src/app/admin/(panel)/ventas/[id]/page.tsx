import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/dates";
import { formatHNL, toCents } from "@/lib/money";
import { requireUser } from "@/server/auth/current";
import { can } from "@/server/auth/permissions";
import { getSale } from "@/server/services/sales";
import { recordPaymentAction, transitionSaleAction } from "@/server/actions/sales";
import { PageHeader, Section, Stat } from "@/components/ui/layout";
import { Table, Td, Th } from "@/components/ui/table";
import { CHANNEL_LABELS, PaymentBadge, SaleStatusBadge } from "@/components/admin/status";
import { TransitionButton } from "@/components/admin/transition-button";
import { PaymentForm } from "@/components/admin/payment-form";

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("sales:read");
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();
  const finance = can(user.role, "finance:read");
  const paid = sale.payments.reduce((s, p) => s + toCents(p.amount), 0);
  const balance = toCents(sale.total) - paid;
  const canWrite = can(user.role, "sales:write");
  const canCancel = can(user.role, "sales:cancel");
  const open = sale.status !== "CANCELADA" && sale.status !== "DEVUELTA";

  return (
    <>
      <PageHeader
        eyebrow={`Venta · ${CHANNEL_LABELS[sale.channel]}`}
        title={sale.code}
        actions={
          <>
            {sale.status === "PENDIENTE" && canWrite && <TransitionButton variant="primary" label="Confirmar (descuenta stock)" action={transitionSaleAction.bind(null, sale.id, "CONFIRMADA")} />}
            {sale.status === "CONFIRMADA" && canWrite && <TransitionButton label="Marcar entregada" action={transitionSaleAction.bind(null, sale.id, "ENTREGADA")} />}
            {sale.status === "PENDIENTE" && canWrite && <TransitionButton variant="danger" askReason label="Cancelar" action={transitionSaleAction.bind(null, sale.id, "CANCELADA")} />}
            {sale.status === "CONFIRMADA" && canCancel && (
              <TransitionButton variant="danger" askReason label="Cancelar y reponer stock" confirmText="Se repondrá el inventario de esta venta. ¿Continuar?" action={transitionSaleAction.bind(null, sale.id, "CANCELADA")} />
            )}
            {sale.status === "ENTREGADA" && canCancel && (
              <TransitionButton variant="danger" askReason label="Registrar devolución" confirmText="Se devolverán las unidades al inventario. ¿Continuar?" action={transitionSaleAction.bind(null, sale.id, "DEVUELTA")} />
            )}
          </>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <SaleStatusBadge status={sale.status} />
          <PaymentBadge status={sale.paymentStatus} />
          <span>{formatDateTime(sale.soldAt)}</span>
          {sale.seller && <span>· vendedor {sale.seller.name}</span>}
          {sale.isDemo && <span className="text-warn">· DEMO</span>}
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 rounded-lg border border-line bg-surface sm:grid-cols-4">
        <Stat label="Total" value={formatHNL(sale.total)} note={toCents(sale.discount) > 0 ? `Descuento ${formatHNL(sale.discount)}` : undefined} />
        <Stat label="Pagado" value={formatHNL(paid)} note={balance > 0 && open ? `Saldo ${formatHNL(balance)}` : undefined} />
        {finance && <Stat label="Costo" value={sale.costTotal ? formatHNL(sale.costTotal) : "—"} note={sale.status === "PENDIENTE" ? "Se fija al confirmar" : !sale.costTotal ? "Falta costo de algún producto" : undefined} />}
        {finance && <Stat label="Utilidad bruta" value={sale.grossProfit ? formatHNL(sale.grossProfit) : "—"} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Section title="Productos">
          <Table>
            <thead><tr><Th>SKU</Th><Th>Producto</Th><Th className="text-right">Cant.</Th><Th className="text-right">Precio</Th><Th className="text-right">Total</Th></tr></thead>
            <tbody>
              {sale.items.map((i) => (
                <tr key={i.id}>
                  <Td className="num">{i.variant.sku}</Td>
                  <Td><Link className="hover:underline" href={`/admin/productos/${i.variant.productId}`}>{i.variant.product.name}</Link></Td>
                  <Td className="num text-right">{i.quantity}</Td>
                  <Td className="num text-right">{formatHNL(i.unitPrice)}</Td>
                  <Td className="num text-right">{formatHNL(i.lineTotal)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {sale.notes && <p className="mt-3 whitespace-pre-line text-sm text-muted">{sale.notes}</p>}
        </Section>

        <div className="flex flex-col gap-6">
          <Section title="Cliente">
            {sale.customer ? (
              <div className="text-sm">
                <p className="font-medium">{sale.customer.name}</p>
                <p className="text-muted">{[sale.customer.phone, sale.customer.city].filter(Boolean).join(" · ")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin cliente registrado.</p>
            )}
          </Section>
          <Section title="Pagos">
            {sale.payments.length === 0 ? <p className="text-sm text-muted">Sin pagos registrados.</p> : (
              <ul className="mb-3 divide-y divide-line/70 text-sm">
                {sale.payments.map((p) => (
                  <li key={p.id} className="flex justify-between py-1.5"><span>{p.method} <span className="text-xs text-muted">{formatDateTime(p.paidAt)}</span></span><span className="num">{formatHNL(p.amount)}</span></li>
                ))}
              </ul>
            )}
            {open && balance > 0 && canWrite && <PaymentForm action={recordPaymentAction.bind(null, sale.id)} balance={(balance / 100).toFixed(2)} />}
          </Section>
        </div>
      </div>
    </>
  );
}
