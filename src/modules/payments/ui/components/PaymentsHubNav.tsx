"use client";

import { ArrowRightLeft, CalendarClock, FileText, Wallet } from "lucide-react";

import { useFeatures } from "@/shared/auth/features.hooks";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

export const PAYMENTS_HUB_BASE = "/settings/payments";
export const PAYMENTS_FX_PATH = `${PAYMENTS_HUB_BASE}/moneda`;
export const PAYMENTS_PLAN_PATH = `${PAYMENTS_HUB_BASE}/plan`;
export const PAYMENTS_DOCUMENTS_PATH = `${PAYMENTS_HUB_BASE}/documentos`;

/**
 * Pestañas del hub Pagos, filtradas por FUNCIÓN del tenant (no por plan): un
 * negocio que no vende con anticipos no ve «Plan de pagos», y uno que cobra en
 * su propia moneda no ve «Moneda y TRM».
 *
 * Se decide con `loaded` para no pintar y quitar. Si la carga de funciones
 * falla, `hasFeature` responde true (fail-open como entitlements) y es la
 * vista quien muestra el 403: esconder pestañas por un error de red deja al
 * dueño sin saber qué tiene contratado.
 *
 * «Plan de pagos» y «Documentos» llegan con F4 y F7; hasta entonces sus rutas
 * no existen y no se ofrecen.
 */
export function paymentsHubTabs(has: (code: string) => boolean, ready: boolean): NavTabItem[] {
  const items: NavTabItem[] = [{ href: PAYMENTS_HUB_BASE, label: "Medios", icon: Wallet, exact: true }];
  if (!ready) return items;
  if (has("payment_plans") && PLAN_TAB_READY) {
    items.push({ href: PAYMENTS_PLAN_PATH, label: "Plan de pagos", icon: CalendarClock });
  }
  if (has("fx_quotes")) items.push({ href: PAYMENTS_FX_PATH, label: "Moneda y TRM", icon: ArrowRightLeft });
  if (has("documents") && DOCUMENTS_TAB_READY) {
    items.push({ href: PAYMENTS_DOCUMENTS_PATH, label: "Documentos", icon: FileText });
  }
  return items;
}

/** Interruptores de entrega: la pestaña existe cuando existe su pantalla (F4 / F7). */
const PLAN_TAB_READY = true;
const DOCUMENTS_TAB_READY = false;

export function PaymentsHubNav() {
  const { loaded, hasFeature } = useFeatures();
  return <NavTabs items={paymentsHubTabs(hasFeature, loaded)} label="Secciones de pagos" />;
}
