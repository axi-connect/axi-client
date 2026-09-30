"use client";

import { Activity, History, Route, Settings } from "lucide-react";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

// Las cuatro pestañas se ven con `calls:read` (Configuración es de solo lectura
// sin `calls:manage`, dentro de la propia vista): no hay filtro por permiso.
const NAV_ITEMS: readonly NavTabItem[] = [
  { href: "/calls", label: "Monitoreo", icon: Activity, exact: true },
  { href: "/calls/history", label: "Historial", icon: History },
  // Plan de modos §5: el único lugar donde se ven y ajustan los marcos.
  { href: "/calls/playbooks", label: "Marcos", icon: Route },
  { href: "/calls/settings", label: "Configuración", icon: Settings },
];

export function CallsNav() {
  const items = NAV_ITEMS;
  return (
    <header className="border-border shrink-0 border-b px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* No es un h1: el titular de cada vista es el suyo (premium F5). */}
        <p className="font-heading text-lg font-bold tracking-tight">Llamadas</p>
        <NavTabs items={items} label="Secciones de llamadas" />
      </div>
    </header>
  );
}
