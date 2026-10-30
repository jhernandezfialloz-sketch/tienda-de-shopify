import type { Role } from "@prisma/client";
import { TelosError } from "@/lib/errors";

/**
 * Matriz de permisos. Se verifica SIEMPRE en el servidor (servicios, acciones y API);
 * ocultar botones en la UI es solo comodidad.
 */
export const PERMISSIONS = [
  "products:read",
  "products:write",
  "inventory:read",
  "inventory:adjust",
  "sales:read",
  "sales:write",
  "sales:cancel",
  "purchases:read",
  "purchases:write",
  "purchases:receive",
  "customers:read",
  "customers:write",
  "suppliers:read",
  "suppliers:write",
  "finance:read",
  "reports:read",
  "marketing:read",
  "marketing:write",
  "audit:read",
  "users:manage",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  OWNER: ALL,
  ADMIN: new Set(PERMISSIONS.filter((p) => p !== "users:manage")),
  SALES: new Set<Permission>([
    "products:read",
    "inventory:read",
    "sales:read",
    "sales:write",
    "customers:read",
    "customers:write",
  ]),
  INVENTORY: new Set<Permission>([
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:adjust",
    "purchases:read",
    "purchases:write",
    "purchases:receive",
    "suppliers:read",
    "suppliers:write",
  ]),
  MARKETING: new Set<Permission>(["products:read", "inventory:read", "sales:read", "customers:read", "marketing:read", "marketing:write", "reports:read"]),
};

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  SALES: "Ventas",
  INVENTORY: "Inventario",
  MARKETING: "Marketing",
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export interface Actor {
  id: string;
  role: Role;
  name: string;
}

export function assertCan(actor: Actor | null | undefined, permission: Permission): asserts actor is Actor {
  if (!actor) throw new TelosError("UNAUTHENTICATED", "Debes iniciar sesión.");
  if (!can(actor.role, permission)) {
    throw new TelosError("FORBIDDEN", `Tu rol (${ROLE_LABELS[actor.role]}) no tiene permiso para esta acción (${permission}).`);
  }
}
