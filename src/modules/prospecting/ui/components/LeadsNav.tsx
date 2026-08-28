"use client";

import { Inbox, ShieldCheck } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

const BASE = "/marketing/leads";

/**
 * Sub-navegación de la captación, por SEGMENTO DE RUTA.
 *
 * Aparece con F2, cuando hay dos vistas que valen una URL propia. Con una sola
 * pantalla la pastilla habría sido decoración. Búsquedas y Fuentes se suman
 * cuando existan (F3/F4): un ítem que apunta a una ruta inexistente es peor que
 * no tener el ítem.
 */
export function LeadsNav({ pendingCount }: { pendingCount?: number | null }) {
  const items: readonly NavTabItem[] = [
    // `exact`: su href ES la base, así que por prefijo se quedaría activa
    // también en el detalle de un lead y en Calidad.
    {
      href: BASE,
      label: "Bandeja",
      icon: Inbox,
      exact: true,
      count:
        typeof pendingCount === "number"
          ? pendingCount.toLocaleString("es-CO")
          : null,
    },
    { href: `${BASE}/quality`, label: "Calidad", icon: ShieldCheck },
  ];

  return <NavTabs items={items} label="Secciones de captación" />;
}
