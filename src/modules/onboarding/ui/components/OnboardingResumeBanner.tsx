"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { firstOpenStep, pendingCount, shouldShowResumeBanner } from "@/modules/onboarding/domain/onboarding-progress";
import { useOnboardingStore } from "@/modules/onboarding/infrastructure/stores/onboarding.store";
import { FlowRouteMini } from "@/modules/onboarding/ui/flow/FlowRouteMini";
import { routeStops } from "@/modules/onboarding/ui/onboarding/onboarding-route";

/**
 * Banner del dashboard para un onboarding sin terminar. Autosuficiente (carga
 * el progreso una vez desde el store compartido) y **nunca bloquea**: informa,
 * enlaza al primer paso abierto y se puede ocultar (persistido en el servidor).
 * Si el progreso no carga —backend sin el módulo, red— no pinta nada: un
 * dashboard sin banner es mejor que un dashboard con un error que no es suyo.
 *
 * Habla el lenguaje del onboarding «Flow»: la ruta en miniatura con el estado
 * de cada parada (hecha, omitida, pendiente) sustituye a la lista de badges.
 * Lleva `flow-ground` en su raíz para que el material resuelva fuera de
 * `/onboarding`.
 */
export function OnboardingResumeBanner() {
  const status = useOnboardingStore((state) => state.status);
  const progress = useOnboardingStore((state) => state.progress);
  const load = useOnboardingStore((state) => state.load);
  const dismissBanner = useOnboardingStore((state) => state.dismissBanner);

  useEffect(() => {
    void load();
  }, [load]);

  if (status !== "ready" || !progress || !shouldShowResumeBanner(progress)) return null;

  const pending = pendingCount(progress);
  const next = firstOpenStep(progress);

  return (
    <section
      aria-label="Configuración pendiente"
      className="flow-ground border-brand/25 bg-brand-ambient relative grid gap-4 overflow-hidden rounded-2xl border px-5 py-5 md:grid-cols-[1fr_auto] md:items-center"
    >
      <div className="min-w-0">
        <h3 className="font-heading text-base font-bold">
          {pending === 1 ? "Te falta 1 paso para dejar tu negocio listo" : `Te faltan ${pending} pasos para dejar tu negocio listo`}
        </h3>
        <p className="text-muted-foreground mt-0.5 text-[0.8125rem]">
          Completa lo pendiente para que tu agente empiece a atender y vender.
        </p>
        <FlowRouteMini stops={routeStops(progress).slice(0, -1)} ariaLabel="Estado de los pasos" className="mt-3" />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => void dismissBanner()}>
          Ocultar
        </Button>
        <Button asChild>
          <Link href={next ? `/onboarding?step=${next}` : "/onboarding"}>
            Continuar
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
