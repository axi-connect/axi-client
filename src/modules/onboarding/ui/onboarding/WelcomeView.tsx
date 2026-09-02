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
 * Bienvenida tras crear la cuenta (mockup aprobado 2026-09-02). Se muestra una
 * sola vez, antes del primer paso: la cuenta ya existe, la prueba ya corre, y
 * esta pantalla lo celebra y anticipa lo que viene. Sin barra de progreso ni
 * indicador de pasos: todavía no se ha empezado nada.
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
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsDTO | null>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

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
    <div className="bg-brand-ambient relative isolate flex min-h-svh w-full flex-col overflow-hidden">
      <Confetti ref={confettiRef} />

      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-6 py-5">
        <BrandLockup />
        <span className="border-border text-muted-foreground hidden h-7 items-center rounded-full border px-3 text-xs sm:inline-flex">
          Prueba de 7 días · sin tarjeta
        </span>
      </header>

      <main className="relative mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center gap-3.5 px-6 pt-5 pb-24 text-center sm:pt-9">
        <div
          aria-hidden="true"
          className="bg-brand-gradient-tri pointer-events-none absolute top-[-40px] left-1/2 -z-10 h-80 w-[min(520px,100%)] -translate-x-1/2 rounded-full opacity-25 blur-3xl dark:opacity-20"
        />

        <div className="mt-2 grid size-28 place-items-center">
          <BrandMark className="size-24" />
        </div>

        <span className="text-brand inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] uppercase">
          <Check aria-hidden="true" className="size-3.5" />
          Cuenta creada
        </span>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-heading max-w-[22ch] text-[1.75rem] leading-[1.1] font-bold tracking-tight outline-none sm:text-[2.125rem]"
        >
          Bienvenido a Axi Connect{firstName ? `, ${firstName}` : ""}
        </h1>

        <p className="text-muted-foreground max-w-[40rem] text-[15px] leading-relaxed">
          <b className="text-foreground font-semibold">{company}</b> ya tiene su cuenta.{" "}
          {endsAt ? (
            <>
              Tu prueba de 7 días empieza hoy y vence el <b className="text-foreground font-semibold">{endsAt}</b>; hasta entonces
              no te pedimos tarjeta.
            </>
          ) : (
            <>Tu prueba de 7 días empieza hoy; hasta que termine no te pedimos tarjeta.</>
          )}
        </p>

        {entitlements ? (
          <span className="border-brand/25 bg-brand/[0.09] inline-flex min-h-[34px] flex-wrap items-center justify-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium">
            {offerLabel(entitlements)}
            <span className="text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <span className="font-normal">{entitlements.offer_kind === "package" ? "paquete completo en prueba" : "en prueba"}</span>
          </span>
        ) : null}

        <section aria-label="Lo que haremos ahora" className="glass-flat mt-3.5 w-full rounded-[20px] p-6 text-left">
          <h2 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[15px] font-bold">
            Lo que haremos ahora
            <span className="text-muted-foreground font-body text-[0.8125rem] font-normal">unos 10 minutos · puedes saltar pasos</span>
          </h2>
          <ol className="mt-3.5 grid gap-2 md:grid-cols-5 md:gap-2.5">
            {ONBOARDING_STEPS.map((step, index) => (
              <li
                key={step.code}
                className="border-border/80 bg-background/70 flex items-start gap-2.5 rounded-xl border p-3 md:flex-col md:gap-2"
              >
                <span className="bg-violet/15 text-violet font-mono grid size-[26px] shrink-0 place-items-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <div>
                  <div className="text-[13px] leading-tight font-semibold">{step.label}</div>
                  <div className="text-muted-foreground mt-0.5 text-xs leading-snug">{STEP_PITCH[step.code]}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-4 flex flex-col items-center gap-2.5">
          <Button size="lg" className="h-11 px-6" onClick={onStart}>
            Configurar mi empresa
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
          <p className="text-muted-foreground text-[0.8125rem]">
            Si prefieres,{" "}
            <Link href={DASHBOARD_PATH} className="text-brand font-medium hover:underline">
              ve directo a tu panel
            </Link>
            : te recordamos lo que falte.
          </p>
        </div>
      </main>
    </div>
  );
}
