"use client";

import { BellRing, CalendarDays, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";
import { TodaySummary } from "./components/calendar/TodaySummary";

/**
 * Cabecera + sub-navegación persistente de la sección full-bleed `/scheduling`
 * (lienzo Agenda premium F1): «Agenda» en Nexa, la frase del día en el
 * calendario y las secciones a la derecha. Todas las secciones son visibles
 * con `scheduling:read`; sin `scheduling:manage` las vistas deshabilitan la edición.
 */
const NAV_ITEMS: readonly NavTabItem[] = [
  { href: "/scheduling/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/scheduling/reminders", label: "Recordatorios", icon: BellRing },
  { href: "/scheduling/settings", label: "Configuración", icon: Settings },
];

export function SchedulingNav() {
  const pathname = usePathname();
  const onCalendar = pathname?.startsWith("/scheduling/calendar") ?? false;
  return (
    <header className="shrink-0 px-4 pt-4 md:px-8 md:pt-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight md:text-4xl">Agenda</h1>
          {onCalendar && (
            <div className="hidden md:block">
              <TodaySummary />
            </div>
          )}
        </div>
        <NavTabs items={NAV_ITEMS} label="Secciones de la agenda" />
      </div>
    </header>
  );
}
