"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";

/**
 * Cabecera + sub-navegación persistente de la sección full-bleed `/crm`
 * (patrón CatalogNav: pills con underline, activo por prefijo de ruta).
 * Los ítems se activan por fase: Pipeline (F3), Tareas (F4) y
 * Configuración (F5, gate `crm:manage`) se añaden a NAV_ITEMS al implementarse.
 */
const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  permission?: string;
}> = [
  { href: "/crm/contacts", label: "Contactos" },
  { href: "/crm/pipeline", label: "Pipeline" },
  { href: "/crm/tasks", label: "Tareas" },
  // { href: "/crm/settings", label: "Configuración", permission: "crm:manage" }, // F5
];

export function CrmNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <header className="shrink-0 border-b border-border px-4 md:px-6">
      <div className="flex items-end gap-6">
        <h1 className="pb-2.5 font-heading text-lg font-bold tracking-tight">CRM</h1>
        <nav aria-label="Secciones del CRM" className="-mb-px min-w-0">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "border-primary font-medium text-brand"
                        : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
