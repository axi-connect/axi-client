"use client";

import { BellRing, CalendarDays, Settings } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

/**
 * Cabecera + sub-navegación persistente de la sección full-bleed `/scheduling`.
 * Todas las secciones son visibles con `scheduling:read`; sin
 * `scheduling:manage` las vistas deshabilitan la edición.
 */
const NAV_ITEMS: readonly NavTabItem[] = [
  { href: "/scheduling/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/scheduling/reminders", label: "Recordatorios", icon: BellRing },
  { href: "/scheduling/settings", label: "Configuración", icon: Settings },
];

export function SchedulingNav() {
  return (
    <header className="border-border shrink-0 border-b px-4 py-2.5 md:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="font-heading text-lg font-bold tracking-tight">Agenda</h1>
        <NavTabs items={NAV_ITEMS} label="Secciones de la agenda" />
      </div>
    </header>
  );
}
