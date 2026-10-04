import { useEffect, useState } from "react";

import { hasVolumeAxis, promotionOpen, type PublicCatalog } from "@/modules/landing/domain/public-catalog";
import type { BillingPeriodId, PricingPlan } from "@/modules/landing/ui/content/landing.content";

/**
 * El estado de la sección de precios, compartido por `PricingPlans` (/precios)
 * y la piel de la película (`FilmPricing`): volumen, periodicidad y el reloj de
 * la promoción. Una sola lógica; cada una decide cómo se pinta.
 */
export function usePricingState(catalog: PublicCatalog) {
  const twoAxis = hasVolumeAxis(catalog);
  const [volumeId, setVolumeId] = useState<string>(catalog.defaultVolumeId);
  const [period, setPeriod] = useState<BillingPeriodId>("monthly");

  // La FECHA de la promoción depende del reloj, y comprobarla en el primer
  // render la congelaría en la del despliegue —la página se prerenderiza—, así
  // que se verifica tras montar. Al vencer, la oferta cae sola a precios de
  // lista sin desplegar nada: fallo seguro. Los cupos ya vienen resueltos.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const clock = now ?? new Date(catalog.asOf);
  const offerOpen = promotionOpen(catalog, clock);

  return { twoAxis, volumeId, setVolumeId, period, setPeriod, clock, offerOpen };
}

/** El enlace del CTA arrastra las dos elecciones: sin ellas, el alta empieza de cero. */
export function signupHref(plan: PricingPlan, volumeId: string, period: BillingPeriodId, twoAxis: boolean): string {
  const [path, query = ""] = plan.cta.href.split("?");
  const params = new URLSearchParams(query);
  if (twoAxis) params.set("volumen", volumeId);
  params.set("periodo", period);
  return `${path}?${params.toString()}`;
}

/** A dónde va el visitante cuando no hay cifra que dar. */
export const SALES_PATH = "/contacto";
