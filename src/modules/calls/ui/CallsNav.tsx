"use client";

import { History } from "lucide-react";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

// F4-C añade Monitoreo (href /calls, exact) y F4-D Configuración
// (/calls/settings, gated por calls:manage — el gate vive aquí, no en NavTabs).
const NAV_ITEMS: readonly NavTabItem[] = [
  { href: "/calls/history", label: "Historial", icon: History },
];

export function CallsNav() {
  return (
    <header className="border-border shrink-0 border-b px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="font-heading text-lg font-bold tracking-tight">Llamadas</h1>
        <NavTabs items={NAV_ITEMS} label="Secciones de llamadas" />
      </div>
    </header>
  );
}
