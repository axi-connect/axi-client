"use client";

import { Activity, History, Settings } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

// El gate RBAC vive en el módulo dueño de la sección (regla de nav-tabs):
// NavTabs recibe los items YA filtrados. Configuración se ve también con
// solo calls:read — dentro, el formulario es de solo lectura.
const NAV_ITEMS: readonly (NavTabItem & { permission?: string })[] = [
  { href: "/calls", label: "Monitoreo", icon: Activity, exact: true },
  { href: "/calls/history", label: "Historial", icon: History },
  { href: "/calls/settings", label: "Configuración", icon: Settings },
];

export function CallsNav() {
  const { hasPermission } = useAuth();
  const items = NAV_ITEMS.filter(
    (item) => item.permission === undefined || hasPermission(item.permission),
  );
  return (
    <header className="border-border shrink-0 border-b px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="font-heading text-lg font-bold tracking-tight">Llamadas</h1>
        <NavTabs items={items} label="Secciones de llamadas" />
      </div>
    </header>
  );
}
