"use client";

import { Building2, FileText, MapPin, SlidersHorizontal } from "lucide-react";

import { useFeatures } from "@/shared/auth/features.hooks";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

export const COMPANY_SETTINGS_BASE = "/settings/company";
export const COMPANY_BRANCHES_PATH = `${COMPANY_SETTINGS_BASE}/sucursales`;
export const COMPANY_FEATURES_PATH = `${COMPANY_SETTINGS_BASE}/funciones`;
export const COMPANY_DOCUMENTS_PATH = `${COMPANY_SETTINGS_BASE}/documentos`;

/**
 * Pestañas de Mi empresa como SUB-RUTAS reales (mismo patrón que la
 * Configuración del CRM): cada una es compartible, tiene su `loading.tsx` y
 * el rastro activo del sidebar funciona sin tocar `nav-active`.
 *
 * «Medios de pago» ya NO vive aquí: se movió al hub Pagos de Ventas
 * (`/settings/payments`, F2 del programa Cobros), donde convive con el plan de
 * pagos y la moneda. `/settings/company/pagos` redirige allí.
 *
 * «Funciones» no se gatea por capacidad a propósito: la pestaña EXPLICA que el
 * plan no incluye Ventas en vez de desaparecer, que es lo que deja al dueño
 * sin saber por qué no tiene cobros.
 *
 * «Documentos» (F7 Cobros) vive AQUÍ y no en Pagos por decisión del dueño: los
 * documentos son el papel de la EMPRESA —emisor, numeración, plantillas— y los
 * consume cualquier proceso (pedidos, CRM, agenda), así que su configuración va
 * junto a la identidad del negocio. Se gatea por la función `documents`, con
 * `loaded` para no pintar y quitar (mismo criterio que el hub Pagos).
 *
 * Deliberadamente por FUNCIÓN y no por permiso: un vendedor de un tenant con
 * documentos encendidos ve la pestaña, entra y lee «esto lo configura quien
 * administra», con quién pedírselo. Es descubrible; esconderla por permiso
 * dejaría a media empresa sin saber que los documentos existen.
 */
export function companySettingsTabs(
  has: (code: string) => boolean,
  ready: boolean,
): NavTabItem[] {
  const items: NavTabItem[] = [
    {
      href: COMPANY_SETTINGS_BASE,
      label: "General",
      icon: Building2,
      exact: true,
    },
    { href: COMPANY_BRANCHES_PATH, label: "Sucursales", icon: MapPin },
    {
      href: COMPANY_FEATURES_PATH,
      label: "Funciones",
      icon: SlidersHorizontal,
    },
  ];
  if (ready && has("documents")) {
    items.push({
      href: COMPANY_DOCUMENTS_PATH,
      label: "Documentos",
      icon: FileText,
    });
  }
  return items;
}

export function CompanySettingsNav() {
  const { loaded, hasFeature } = useFeatures();
  return (
    <NavTabs
      items={companySettingsTabs(hasFeature, loaded)}
      label="Secciones de la empresa"
    />
  );
}
