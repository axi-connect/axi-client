"use client";

import { Activity, History, Settings } from "lucide-react";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

// Las tres pestañas se ven con `calls:read` (Configuración es de solo lectura
// sin `calls:manage`, dentro de la propia vista): no hay filtro por permiso.
const NAV_ITEMS: readonly NavTabItem[] = [
  { href: "/calls", label: "Monitoreo", icon: Activity, exact: true },
  { href: "/calls/history", label: "Historial", icon: History },
  { href: "/calls/settings", label: "Configuración", icon: Settings },
];

export function CallsNav() {
  const items = NAV_ITEMS;
  return (
    <header className="border-border shrink-0 border-b px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="font-heading text-lg font-bold tracking-tight">Llamadas</h1>
        <NavTabs items={items} label="Secciones de llamadas" />
      </div>
    </header>
  );
}
