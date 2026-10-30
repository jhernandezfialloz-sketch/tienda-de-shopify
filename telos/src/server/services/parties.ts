import { db, transaction } from "@/lib/db";
import { assertCan, type Actor } from "@/server/auth/permissions";
import { parse } from "@/server/validation/common";
import { customerInput, supplierInput } from "@/server/validation/schemas";
import { audit, emit } from "./audit";

// Clientes y proveedores: CRUD simple con auditoría. (Métricas de CRM en Fase 2.)

export async function createCustomer(actor: Actor, raw: unknown) {
  assertCan(actor, "customers:write");
  const input = parse(customerInput, raw);
  return transaction(async (tx) => {
    const customer = await tx.customer.create({ data: input });
    await audit(tx, { userId: actor.id, action: "customer.create", entityType: "customer", entityId: customer.id, after: input });
    await emit(tx, "CUSTOMER_CREATED", { customerId: customer.id });
    return customer;
  });
}

export async function updateCustomer(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "customers:write");
  const input = parse(customerInput, raw);
  return transaction(async (tx) => {
    const before = await tx.customer.findUniqueOrThrow({ where: { id } });
    const customer = await tx.customer.update({ where: { id }, data: input });
    await audit(tx, { userId: actor.id, action: "customer.update", entityType: "customer", entityId: id, before, after: input });
    return customer;
  });
}

export async function createSupplier(actor: Actor, raw: unknown) {
  assertCan(actor, "suppliers:write");
  const input = parse(supplierInput, raw);
  return transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data: input });
    await audit(tx, { userId: actor.id, action: "supplier.create", entityType: "supplier", entityId: supplier.id, after: input });
    return supplier;
  });
}

export async function updateSupplier(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "suppliers:write");
  const input = parse(supplierInput, raw);
  return transaction(async (tx) => {
    const before = await tx.supplier.findUniqueOrThrow({ where: { id } });
    const supplier = await tx.supplier.update({ where: { id }, data: input });
    await audit(tx, { userId: actor.id, action: "supplier.update", entityType: "supplier", entityId: id, before, after: input });
    return supplier;
  });
}

export async function listCustomers(q?: string, take = 50) {
  return db.customer.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take,
    include: {
      sales: { where: { status: { in: ["CONFIRMADA", "ENTREGADA"] } }, select: { total: true, soldAt: true } },
    },
  });
}

export async function listSuppliers(q?: string) {
  return db.supplier.findMany({
    where: { active: true, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { name: "asc" },
    include: { purchases: { where: { status: "RECIBIDA" }, select: { total: true } } },
  });
}
