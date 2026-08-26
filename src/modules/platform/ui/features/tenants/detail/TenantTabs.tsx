"use client";

/**
 * Tabs del detalle como SEGMENTOS DE RUTA (spec D11): deep-linking directo,
 * back/forward correcto y el layout conserva el header entre tabs.
 */
import { Database, Gauge, LayoutDashboard, Receipt, ScrollText, Users } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

export function TenantTabs({ tenantId }: { tenantId: string }) {
  const base = `/platform/tenants/${tenantId}`;

  const tabs: readonly NavTabItem[] = [
    // `exact`: «Resumen» vive en la base del detalle, así que por prefijo se
    // quedaría activa en todas sus hermanas.
    { href: base, label: "Resumen", icon: LayoutDashboard, exact: true },
    { href: `${base}/users`, label: "Usuarios", icon: Users },
    { href: `${base}/plan`, label: "Plan & Límites", icon: Gauge },
    { href: `${base}/billing`, label: "Facturación", icon: Receipt },
    { href: `${base}/database`, label: "Base de datos", icon: Database },
    { href: `${base}/audit`, label: "Auditoría", icon: ScrollText },
  ];

  return <NavTabs items={tabs} label="Secciones del tenant" surface="inline" prefetch={false} />;
}
