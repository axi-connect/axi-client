"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/core/lib/utils";

/**
 * Cabecera + sub-navegación persistente de la sección full-bleed `/scheduling`
 * (patrón CrmNav). Todas las secciones son visibles con `scheduling:read`;
 * sin `scheduling:manage` las vistas deshabilitan la edición.
 */
const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/scheduling/calendar", label: "Calendario" },
  { href: "/scheduling/reminders", label: "Recordatorios" },
  { href: "/scheduling/settings", label: "Configuración" },
];

export function SchedulingNav() {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-border px-4 md:px-6">
      <div className="flex items-end gap-6">
        <h1 className="pb-2.5 font-heading text-lg font-bold tracking-tight">Agenda</h1>
        <nav aria-label="Secciones de la agenda" className="-mb-px min-w-0">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
