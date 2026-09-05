"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { readBrandPaletteCss } from "@/core/lib/brand-palette";
import { useSplashOptional } from "@/core/providers/splash-provider";
import { BrandLockup } from "@/shared/components/ui/brand-lockup";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { Button } from "@/shared/components/ui/button";
import { Confetti, brandCelebration, type ConfettiApi } from "@/shared/components/ui/confetti";
import { offerLabel, trialEndsDate, type EntitlementsDTO } from "@/modules/onboarding/domain/entitlements";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/modules/onboarding/domain/onboarding-progress";
import { getMyEntitlements } from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";
import { ONBOARDING_STEP_ICONS } from "@/modules/onboarding/ui/onboarding/onboarding-route";

const DASHBOARD_PATH = "/dashboard";

/** Qué aporta cada paso, en una línea: el usuario decide si lo hace ahora o lo salta. */
const STEP_PITCH: Record<OnboardingStep, string> = {
  niche: "El tipo de negocio afina agentes y catálogo",
  business_hours: "Cuándo atiende tu agente y cuándo avisa",
  catalog: "Sube tu carta o lista y la IA la lee",
  agents: "Plantillas de tu sector, a tu medida",
  whatsapp: "Conecta tu número cuando quieras",
};

/**
 * Bienvenida tras crear la cuenta (onboarding «Flow», 2026-09-05; antes mockup
 * 2026-09-02). Se muestra una sola vez, antes del primer paso, **sobre el campo
 * coral** que `FlowStage` pone encima del suelo: es el cierre del registro y
 * su celebración. Sin barra de progreso ni ruta: todavía no se ha empezado
 * nada; la ruta sube desde abajo cuando el campo se hunde.
 *
 * Los cinco pasos van como fichas de cristal con el mismo icono que luego
 * viaja a su parada de la ruta: lo que se anuncia aquí es lo que se recorre.
 *
 * El confeti espera a que el splash de entrada haya terminado (`phase ===
 * "idle"`): disparar debajo del overlay o durante la hidratación sería una
 * ráfaga que nadie ve y un hilo principal ocupado. Es una ráfaga única y
 * finita, no un loop (DESIGN-SYSTEM §6), y con `prefers-reduced-motion` el
 * componente no pinta nada.
 */
export function WelcomeView({
  firstName,
  companyName,
  onStart,
}: {
  firstName: string | null;
  companyName: string | null;
  onStart: () => void;
}) {
  const splash = useSplashOptional();
  const confettiRef = useRef<ConfettiApi | null>(null);
  const firedRef = useRef(false);
  const [entitlements, setEntitlements] = useState<EntitlementsDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyEntitlements()
      .then((data) => {
        if (!cancelled) setEntitlements(data);
      })
      .catch(() => {
        /* sin oferta ni fecha: la bienvenida sigue */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (splash.phase !== "idle" || firedRef.current) return;
    firedRef.current = true;
    confettiRef.current?.fire(brandCelebration(readBrandPaletteCss(document.documentElement)));
  }, [splash.phase]);

  const endsAt = entitlements ? trialEndsDate(entitlements) : null;
  const company = companyName ?? "Tu empresa";

  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col">
      <Confetti ref={confettiRef} />

      <header className="flex w-full items-center justify-between gap-4 px-6 pt-6 sm:px-10 sm:pt-7">
        <BrandLockup />
        <span className="sf-line text-muted-foreground hidden h-7 items-center rounded-full border px-3 text-xs sm:inline-flex">
          Prueba de 7 días · sin tarjeta
        </span>
      </header>

      <main className="flex w-full flex-1 flex-col items-center px-6 pt-4 pb-12 sm:pt-6">
        <div className="mt-1 mb-2 grid size-24 place-items-center">
          <BrandMark className="size-24" />
        </div>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] uppercase">
          <Check aria-hidden="true" className="size-3.5" />
          Cuenta creada
        </span>

        <FlowScreen
          size="wide"
          focusHeading
          className="mt-2"
          title={<>Bienvenido a Axi Connect{firstName ? `, ${firstName}` : ""}</>}
          lead={
            <>
              <b className="text-foreground font-semibold">{company}</b> ya tiene su cuenta.{" "}
              {endsAt ? (
                <>
                  Tu prueba de 7 días empieza hoy y vence el <b className="text-foreground font-semibold">{endsAt}</b>; hasta entonces no te
                  pedimos tarjeta.
                </>
              ) : (
                <>Tu prueba de 7 días empieza hoy; hasta que termine no te pedimos tarjeta.</>
              )}
            </>
          }
        >
          {entitlements ? (
            <span className="sf-glass inline-flex min-h-[34px] flex-wrap items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              {offerLabel(entitlements)}
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <span className="text-muted-foreground font-normal">
                {entitlements.offer_kind === "package" ? "paquete completo en prueba" : "en prueba"}
              </span>
            </span>
          ) : null}

          <div className="mt-2 flex w-full flex-col items-center gap-0.5 text-[12.5px] sm:flex-row sm:justify-between">
            <span className="text-foreground font-semibold">Lo que haremos ahora</span>
            <span className="text-muted-foreground">unos 10 minutos · puedes saltar pasos</span>
          </div>
          <ol className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Lo que haremos ahora">
            {ONBOARDING_STEPS.map((step) => {
              const Icon = ONBOARDING_STEP_ICONS[step.code];
              return (
                <li key={step.code} className="sf-glass flex flex-col gap-1.5 rounded-[14px] p-3 text-left last:sm:col-span-2 last:lg:col-span-1">
                  <span className="sf-glass-on sf-line grid size-8 place-items-center rounded-full">
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.9} />
                  </span>
                  <span className="text-[13px] leading-tight font-semibold">{step.label}</span>
                  <span className="text-muted-foreground text-[11.5px] leading-snug">{STEP_PITCH[step.code]}</span>
                </li>
              );
            })}
          </ol>

          <Button
            size="lg"
            onClick={onStart}
            className="mt-2 h-14 w-full max-w-[440px] rounded-[14px] text-[15.5px] font-semibold shadow-[0_18px_50px_rgb(0_0_0/.18)] transition-[transform,box-shadow] hover:-translate-y-px active:scale-[.98]"
          >
            Configurar mi empresa
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
          <p className="text-muted-foreground text-[13px]">
            Si prefieres,{" "}
            <Link href={DASHBOARD_PATH} className="text-foreground font-semibold hover:underline">
              ve directo a tu panel
            </Link>
            : te recordamos lo que falte.
          </p>
        </FlowScreen>
      </main>
    </div>
  );
}
