"use client";

/**
 * Tabs de la sección Calidad como SEGMENTOS DE RUTA (spec D11): deep-linking
 * directo y back/forward correcto. Terminología: NUNCA "Corridas".
 */
import { Bug, ClipboardList, Layers, PlayCircle } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

const BASE = "/platform/quality";

const TABS: readonly NavTabItem[] = [
  { href: `${BASE}/runs`, label: "Ejecuciones", icon: PlayCircle },
  { href: `${BASE}/scenarios`, label: "Escenarios", icon: ClipboardList },
  { href: `${BASE}/suites`, label: "Suites", icon: Layers },
  { href: `${BASE}/debugger`, label: "Depurador", icon: Bug },
];

export function QualityTabs() {
  return <NavTabs items={TABS} label="Secciones de calidad" surface="inline" prefetch={false} />;
}
