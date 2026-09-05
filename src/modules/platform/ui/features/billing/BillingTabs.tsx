"use client";

/**
 * Pestañas de la sección de facturación de plataforma. Cambian de RUTA, así que
 * son navegación (`NavTabs`) y no `Tabs` de Radix — la semántica no es
 * decorativa (DESIGN-SYSTEM §9.3).
 */
import { Eye, Layers3, Percent, Scale, SlidersHorizontal, Wallet } from "lucide-react";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

const BASE = "/platform/billing";

const TABS: readonly NavTabItem[] = [
  // `exact`: la cartera vive en la base de la sección, así que por prefijo se
  // quedaría activa también en «Tarifas».
  { href: BASE, label: "Cartera", icon: Wallet, exact: true },
  { href: `${BASE}/prices`, label: "Tarifas", icon: Scale },
  // Catálogo de dos ejes (Tanda A2)
  { href: `${BASE}/tiers`, label: "Tramos", icon: Layers3 },
  { href: `${BASE}/promotions`, label: "Promociones", icon: Percent },
  { href: `${BASE}/parameters`, label: "Parámetros", icon: SlidersHorizontal },
  { href: `${BASE}/public`, label: "Vista pública", icon: Eye },
];

export function BillingTabs() {
  return <NavTabs items={TABS} label="Secciones de facturación" surface="inline" prefetch={false} />;
}
