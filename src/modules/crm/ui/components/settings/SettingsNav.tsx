"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";

const NAV_ITEMS = [
  { href: "/crm/settings/pipelines", label: "Pipelines" },
  { href: "/crm/settings/tags", label: "Etiquetas" },
  { href: "/crm/settings/segments", label: "Segmentos" },
  { href: "/crm/settings/imports", label: "Imports" },
] as const;

/**
 * Sub-nav de Configuración del CRM. Toda la sección exige `crm:manage`
 * (guard UX — el backend valida siempre): sin permiso, fuera de la sección.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission, status } = useAuth();
  const allowed = hasPermission("crm:manage");

  useEffect(() => {
    if (status === "authenticated" && !allowed) router.replace("/crm/pipeline");
  }, [status, allowed, router]);

  return (
    <nav aria-label="Secciones de configuración" className="border-b border-border">
      <ul className="-mb-px flex flex-wrap items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors",
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
  );
}
