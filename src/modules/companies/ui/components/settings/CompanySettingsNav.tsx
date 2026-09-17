"use client";

import { Building2, MapPin, SlidersHorizontal } from "lucide-react";

import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

export const COMPANY_SETTINGS_BASE = "/settings/company";
export const COMPANY_BRANCHES_PATH = `${COMPANY_SETTINGS_BASE}/sucursales`;
export const COMPANY_FEATURES_PATH = `${COMPANY_SETTINGS_BASE}/funciones`;

/**
 * Pestañas de Mi empresa como SUB-RUTAS reales (mismo patrón que la
 * Configuración del CRM): cada una es compartible, tiene su `loading.tsx` y
 * el rastro activo del sidebar funciona sin tocar `nav-active`.
 *
 * «Medios de pago» ya NO vive aquí: se movió al hub Pagos de Ventas
 * (`/settings/payments`, F2 del programa Cobros), donde convive con el plan de
 * pagos, la moneda y los documentos. `/settings/company/pagos` redirige allí.
 *
 * «Funciones» no se gatea por capacidad a propósito: la pestaña EXPLICA que el
 * plan no incluye Ventas en vez de desaparecer, que es lo que deja al dueño
 * sin saber por qué no tiene cobros.
 */
export function companySettingsTabs(): NavTabItem[] {
  return [
    { href: COMPANY_SETTINGS_BASE, label: "General", icon: Building2, exact: true },
    { href: COMPANY_BRANCHES_PATH, label: "Sucursales", icon: MapPin },
    { href: COMPANY_FEATURES_PATH, label: "Funciones", icon: SlidersHorizontal },
  ];
}

export function CompanySettingsNav() {
  return <NavTabs items={companySettingsTabs()} label="Secciones de la empresa" />;
}
