import type { Permission } from "@/server/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  permission?: Permission;
  /** Módulos aún no construidos: se muestran como próximos, sin enlace falso. */
  phase?: string;
}

export const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard" }] },
  {
    group: "Comprar",
    items: [
      { href: "/admin/compras", label: "Compras", permission: "purchases:read" },
      { href: "/admin/proveedores", label: "Proveedores", permission: "suppliers:read" },
    ],
  },
  {
    group: "Operar",
    items: [
      { href: "/admin/productos", label: "Productos", permission: "products:read" },
      { href: "/admin/inventario", label: "Inventario", permission: "inventory:read" },
      { href: "/admin/movimientos", label: "Movimientos", permission: "inventory:read" },
    ],
  },
  {
    group: "Vender",
    items: [
      { href: "/admin/ventas", label: "Ventas", permission: "sales:read" },
      { href: "/admin/clientes", label: "Clientes", permission: "customers:read" },
    ],
  },
  {
    group: "Controlar",
    items: [
      { href: "/admin/analytics", label: "Analytics", phase: "Fase 2" },
      { href: "/admin/marketing", label: "Marketing", phase: "Fase 5" },
      { href: "/admin/reportes", label: "Reportes", phase: "Fase 2" },
    ],
  },
  {
    group: "Sistema",
    items: [
      { href: "/admin/notificaciones", label: "Notificaciones" },
      { href: "/admin/actividad", label: "Actividad", permission: "audit:read" },
      { href: "/admin/configuracion", label: "Configuración", phase: "Fase 2" },
    ],
  },
];
