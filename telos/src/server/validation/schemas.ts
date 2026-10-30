import { z } from "zod";
import { MANUAL_MOVEMENT_TYPES } from "@/server/services/inventory";
import { money, nonNegativeInt, optionalMoney, optionalText, positiveInt } from "./common";

export const variantInput = z.object({
  id: z.string().optional(),
  color: optionalText(40),
  size: optionalText(20),
  sku: optionalText(60),
  barcode: optionalText(60),
  price: optionalMoney,
  cost: optionalMoney,
  minimumStock: z.preprocess((v) => (v === "" || v === null ? undefined : v), nonNegativeInt.optional()),
  initialStock: z.preprocess((v) => (v === "" || v === null ? undefined : v), nonNegativeInt.optional()),
  active: z.boolean().optional(),
});

export const productInput = z.object({
  name: z.string().trim().min(2, { message: "Nombre requerido" }).max(120),
  categoryId: z.string().min(1, { message: "Selecciona una categoría" }),
  brand: optionalText(60),
  description: optionalText(4000),
  material: optionalText(120),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  minimumStock: nonNegativeInt.default(0),
  internalNotes: optionalText(2000),
  variants: z.array(variantInput).min(1, { message: "Agrega al menos una variante" }).max(100),
});
export type ProductInput = z.infer<typeof productInput>;

export const adjustmentInput = z.object({
  variantId: z.string().min(1),
  type: z.enum(MANUAL_MOVEMENT_TYPES),
  quantity: nonNegativeInt,
  direction: z.enum(["in", "out"]).optional(),
  reason: z.string().trim().min(3, { message: "Explica la razón del ajuste" }).max(300),
});

export const SALES_CHANNELS = ["TIENDA", "INSTAGRAM", "FACEBOOK", "TIKTOK", "WHATSAPP", "REFERIDO", "VENTA_DIRECTA", "MARKETPLACE", "WEB", "OTRO"] as const;
export const PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Contra entrega", "Otro"] as const;

export const saleInput = z.object({
  idempotencyKey: optionalText(80),
  customerId: optionalText(40),
  newCustomer: z
    .object({ name: z.string().trim().min(2).max(120), phone: optionalText(30), city: optionalText(60) })
    .optional(),
  channel: z.enum(SALES_CHANNELS),
  paymentMethod: optionalText(40),
  sellerId: optionalText(40),
  soldAt: z.coerce.date().optional(),
  discount: optionalMoney,
  notes: optionalText(1000),
  confirm: z.boolean().default(false),
  markPaid: z.boolean().default(false),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: positiveInt,
        unitPrice: optionalMoney, // si se omite, usa el precio de la variante
        discount: optionalMoney,
      }),
    )
    .min(1, { message: "Agrega al menos un producto" })
    .max(100),
});
export type SaleInput = z.infer<typeof saleInput>;

export const paymentInput = z.object({
  amount: money,
  method: z.string().trim().min(1).max(40),
  reference: optionalText(100),
});

export const purchaseInput = z.object({
  supplierId: optionalText(40),
  orderedAt: z.coerce.date().optional(),
  shippingCost: optionalMoney,
  taxes: optionalMoney,
  otherCosts: optionalMoney,
  paymentMethod: optionalText(40),
  notes: optionalText(1000),
  status: z.enum(["BORRADOR", "ORDENADA"]).default("BORRADOR"),
  items: z
    .array(z.object({ variantId: z.string().min(1), quantity: positiveInt, unitCost: money }))
    .min(1, { message: "Agrega al menos un producto" })
    .max(200),
});
export type PurchaseInput = z.infer<typeof purchaseInput>;

export const customerInput = z.object({
  name: z.string().trim().min(2, { message: "Nombre requerido" }).max(120),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().email({ message: "Correo inválido" }).optional()),
  city: optionalText(60),
  acquisitionSource: optionalText(40),
  notes: optionalText(2000),
});

export const supplierInput = z.object({
  name: z.string().trim().min(2, { message: "Nombre requerido" }).max(120),
  company: optionalText(120),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().email({ message: "Correo inválido" }).optional()),
  address: optionalText(300),
  leadTimeDays: z.preprocess((v) => (v === "" || v == null ? undefined : v), nonNegativeInt.optional()),
  notes: optionalText(2000),
});
