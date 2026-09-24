"use client";

/**
 * Tabs de la sección Calidad como SEGMENTOS DE RUTA (spec D11): deep-linking
 * directo y back/forward correcto. Terminología: NUNCA "Corridas".
 */
import { Bug, ClipboardList, Database, Layers, MessageSquareText, PlayCircle, Radar } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

const BASE = "/platform/quality";

const TABS: readonly NavTabItem[] = [
  // Simulacro primero: es la puerta de entrada manual del módulo (mockup F0)
  { href: `${BASE}/simulator`, label: "Simulacro", icon: MessageSquareText },
  { href: `${BASE}/runs`, label: "Ejecuciones", icon: PlayCircle },
  { href: `${BASE}/scenarios`, label: "Escenarios", icon: ClipboardList },
  { href: `${BASE}/suites`, label: "Suites", icon: Layers },
  // Datasets etiquetados + probes (upgrade F4)
  { href: `${BASE}/datasets`, label: "Datasets", icon: Database },
  // Estado por capacidad del agente (upgrade F5)
  { href: `${BASE}/capabilities`, label: "Capacidades", icon: Radar },
  { href: `${BASE}/debugger`, label: "Depurador", icon: Bug },
];

export function QualityTabs() {
  return <NavTabs items={TABS} label="Secciones de calidad" surface="inline" prefetch={false} />;
}
