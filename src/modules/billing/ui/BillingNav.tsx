"use client";

import { FileText, Wallet } from "lucide-react";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

/**
 * Sub-navegación de la sección `/billing`. Cambian de RUTA, así que son
 * navegación y no pestañas de Radix (DESIGN-SYSTEM §9.3).
 *
 * Sin filtro por permiso: las dos vistas van con `billing:read`, que es el
 * permiso que ya gatea el ítem del sidebar. Quien llega aquí puede ver ambas.
 */
const TABS: readonly NavTabItem[] = [
  // `exact`: el resumen vive en la base de la sección y por prefijo se quedaría
  // activo también en «Facturas».
  { href: "/billing", label: "Resumen", icon: Wallet, exact: true },
  { href: "/billing/invoices", label: "Facturas", icon: FileText },
];

export function BillingNav() {
  return <NavTabs items={TABS} label="Secciones de facturación" />;
}
