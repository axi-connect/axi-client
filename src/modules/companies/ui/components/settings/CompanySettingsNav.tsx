"use client";

import { Building2, MapPin, Wallet } from "lucide-react";

import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

export const COMPANY_SETTINGS_BASE = "/settings/company";
export const COMPANY_BRANCHES_PATH = `${COMPANY_SETTINGS_BASE}/sucursales`;
export const COMPANY_PAYMENTS_PATH = `${COMPANY_SETTINGS_BASE}/pagos`;

/**
 * Pestañas de Mi empresa como SUB-RUTAS reales (mismo patrón que la
 * Configuración del CRM): cada una es compartible, tiene su `loading.tsx` y
 * el rastro activo del sidebar funciona sin tocar `nav-active`.
 *
 * «Medios de pago» depende de la capacidad `sales` del plan. Se decide con
 * `loaded` para no pintar y quitar la pestaña; si la carga de capacidades
 * falla, `hasCapability` responde true y es la vista quien muestra el 403.
 */
export function companySettingsTabs(showPayments: boolean): NavTabItem[] {
  const items: NavTabItem[] = [
    { href: COMPANY_SETTINGS_BASE, label: "General", icon: Building2, exact: true },
    { href: COMPANY_BRANCHES_PATH, label: "Sucursales", icon: MapPin },
  ];
  if (showPayments) items.push({ href: COMPANY_PAYMENTS_PATH, label: "Medios de pago", icon: Wallet });
  return items;
}

export function CompanySettingsNav() {
  const { loaded, hasCapability } = useEntitlements();
  return (
    <NavTabs
      items={companySettingsTabs(loaded && hasCapability("sales"))}
      label="Secciones de la empresa"
    />
  );
}
