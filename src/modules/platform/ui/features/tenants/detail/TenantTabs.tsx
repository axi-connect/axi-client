"use client";

/**
 * Tabs del detalle como SEGMENTOS DE RUTA (spec D11): deep-linking directo,
 * back/forward correcto y el layout conserva el header entre tabs.
 * Activa = subrayado coral (el coral señala acción/estado activo).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/core/lib/utils";

const TABS = [
  { label: "Resumen", segment: "" },
  { label: "Usuarios", segment: "users" },
  { label: "Plan & Límites", segment: "plan" },
  { label: "Base de datos", segment: "database" },
  { label: "Auditoría", segment: "audit" },
] as const;

export function TenantTabs({ tenantId }: { tenantId: string }) {
  const pathname = usePathname();
  const base = `/platform/tenants/${tenantId}`;

  return (
    <nav aria-label="Secciones del tenant" className="overflow-x-auto border-b border-border">
      <ul className="flex min-w-max items-center gap-1">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const isActive = tab.segment
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === base;
          return (
            <li key={tab.label}>
              <Link
                href={href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
