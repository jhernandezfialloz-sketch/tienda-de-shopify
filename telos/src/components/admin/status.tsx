import type { PaymentStatus, PurchaseStatus, SaleStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { SALE_STATUS_LABELS } from "@/server/services/sale-rules";
import { PURCHASE_STATUS_LABELS } from "@/server/services/purchase-rules";

const SALE_TONE: Record<SaleStatus, "neutral" | "ok" | "warn" | "danger" | "olive"> = {
  PENDIENTE: "warn",
  CONFIRMADA: "olive",
  ENTREGADA: "ok",
  CANCELADA: "danger",
  DEVUELTA: "danger",
};
const PAY_TONE: Record<PaymentStatus, "neutral" | "ok" | "warn" | "danger"> = { PENDIENTE: "neutral", PARCIAL: "warn", PAGADA: "ok", REEMBOLSADA: "danger" };
const PAY_LABEL: Record<PaymentStatus, string> = { PENDIENTE: "Sin pagar", PARCIAL: "Pago parcial", PAGADA: "Pagada", REEMBOLSADA: "Reembolsada" };
const PURCHASE_TONE: Record<PurchaseStatus, "neutral" | "ok" | "warn" | "danger" | "olive"> = {
  BORRADOR: "neutral",
  ORDENADA: "warn",
  ENVIADA: "olive",
  RECIBIDA: "ok",
  CANCELADA: "danger",
};

export const SaleStatusBadge = ({ status }: { status: SaleStatus }) => <Badge tone={SALE_TONE[status]}>{SALE_STATUS_LABELS[status]}</Badge>;
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAY_TONE[status]}>{PAY_LABEL[status]}</Badge>;
export const PurchaseStatusBadge = ({ status }: { status: PurchaseStatus }) => <Badge tone={PURCHASE_TONE[status]}>{PURCHASE_STATUS_LABELS[status]}</Badge>;

export const CHANNEL_LABELS: Record<string, string> = {
  TIENDA: "Tienda", INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", WHATSAPP: "WhatsApp",
  REFERIDO: "Referido", VENTA_DIRECTA: "Venta directa", MARKETPLACE: "Marketplace", WEB: "Web", OTRO: "Otro",
};
