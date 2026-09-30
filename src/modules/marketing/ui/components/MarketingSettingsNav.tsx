"use client";

import { FileText, Settings, ShieldCheck, UserMinus } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

const BASE = "/marketing/settings";

/**
 * Sub-navegación de la configuración, por SEGMENTO DE RUTA (no por estado
 * local): cada pestaña tiene su propio fetch y su propio estado, así que cada
 * una merece una URL compartible y que el back del navegador funcione.
 *
 * El sidebar del tenant llega hasta este nivel; bajar un cuarto nivel al menú
 * lo llenaría de ruido para cinco pantallas que solo se tocan al configurar.
 */
export function MarketingSettingsNav({ optOutCount }: { optOutCount?: number | null }) {
  const items: readonly NavTabItem[] = [
    // `exact`: su href ES la base de la sección, así que por prefijo se
    // quedaría activa también en las otras tres.
    { href: BASE, label: "Ajustes", icon: Settings, exact: true },
    { href: `${BASE}/templates`, label: "Mensajes", icon: FileText },
    {
      href: `${BASE}/opt-outs`,
      label: "Bajas",
      icon: UserMinus,
      count: typeof optOutCount === "number" ? optOutCount.toLocaleString("es-CO") : null,
    },
    // P1 piloto de captación: por dónde puede abrir contacto Axi.
    { href: `${BASE}/outreach`, label: "Política de contacto", icon: ShieldCheck },
  ];

  return <NavTabs items={items} label="Secciones de configuración" surface="inline" prefetch={false} />;
}
