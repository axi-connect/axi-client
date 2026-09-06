"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { readBrandPaletteCss } from "@/core/lib/brand-palette";
import { cn } from "@/core/lib/utils";
import { useSplashOptional } from "@/core/providers/splash-provider";
import { flowStage, spring } from "@/core/styles/motion";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { Confetti, brandCelebrationShort, type ConfettiApi } from "@/shared/components/ui/confetti";
import { nicheByCode } from "@/modules/onboarding/domain/niches";
import {
  ONBOARDING_STEPS,
  stepStatus,
  type OnboardingProgressDTO,
  type StepStatus,
} from "@/modules/onboarding/domain/onboarding-progress";
import { offerLabel, trialEndsLabel, type EntitlementsDTO } from "@/modules/onboarding/domain/entitlements";
import { getMyEntitlements } from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";
import { FlowActions } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";
import { ONBOARDING_STEP_ICONS } from "@/modules/onboarding/ui/onboarding/onboarding-route";

const STATUS_LABEL = { done: "Listo", skipped: "Para después", pending: "Pendiente" } as const;

/**
 * Pantalla final (onboarding «Flow», aprobado 2026-09-05). Tres cosas finitas
 * y en orden: la ruta enciende sus paradas hechas (lo hace `FlowRoute
 * celebrate`, en el orquestador), el resumen entra escalonado detrás, y cae la
 * ráfaga corta de confeti (`brandCelebrationShort`) — la segunda y última del
 * viaje, con las mismas condiciones que la de la bienvenida: colores de los
 * tokens, una sola vez, solo con el splash en reposo, nada con reduced-motion.
 *
 * Resume lo configurado, muestra qué incluye la prueba (`GET /me/entitlements`,
 * ya en unidades comerciales: aquí no se divide nada) y cierra el onboarding
 * (`POST /onboarding/complete`). Si los entitlements no cargan, el bloque no se
 * pinta: el cierre no depende de facturación.
 */
export function DoneStep({
  progress,
  companyName,
  saving,
  error,
  onFinish,
}: {
  progress: OnboardingProgressDTO;
  companyName: string | null;
  saving: boolean;
  error: string | null;
  onFinish: () => void;
}) {
  const [entitlements, setEntitlements] = useState<EntitlementsDTO | null>(null);
  const reduced = useReducedMotion() ?? false;
  const splash = useSplashOptional();
  const confettiRef = useRef<ConfettiApi | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getMyEntitlements()
      .then((data) => {
        if (!cancelled) setEntitlements(data);
      })
      .catch(() => {
        /* sin bloque «tu prueba incluye»; el cierre sigue */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: { code: string; label: string; value: string; status: StepStatus; icon: (typeof ONBOARDING_STEP_ICONS)[keyof typeof ONBOARDING_STEP_ICONS] }[] = [
    {
      code: "niche",
      label: "Tipo de negocio",
      value: nicheByCode(progress.niche_code)?.name ?? "Sin definir",
      status: progress.niche_code ? "done" : "pending",
      icon: ONBOARDING_STEP_ICONS.niche,
    },
    ...ONBOARDING_STEPS.filter((step) => step.code !== "niche").map((step) => {
      const status = stepStatus(progress, step.code);
      return { code: step.code, label: step.label, value: STATUS_LABEL[status], status, icon: ONBOARDING_STEP_ICONS[step.code] };
    }),
  ];

  // La ruta enciende una parada cada `lightEvery` (las hechas y la de «Listo»);
  // el resumen y el confeti esperan a que termine para no pisarse.
  const lit = ONBOARDING_STEPS.filter((step) => stepStatus(progress, step.code) === "done").length + 1;
  const base = reduced ? 0 : lit * flowStage.lightEvery + 0.2;

  useEffect(() => {
    if (splash.phase !== "idle" || firedRef.current) return;
    firedRef.current = true;
    const timer = setTimeout(
      () => confettiRef.current?.fire(brandCelebrationShort(readBrandPaletteCss(document.documentElement))),
      base * 1000,
    );
    return () => clearTimeout(timer);
  }, [splash.phase, base]);

  const enter = (index: number) => ({
    initial: reduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { ...spring.soft, delay: base + index * flowStage.staggerEvery },
  });

  return (
    <div className="flex w-full flex-col items-center">
      <Confetti ref={confettiRef} />
      <div className="mb-2 grid size-24 place-items-center">
        <BrandMark className="size-24" />
      </div>
      <FlowScreen
        focusHeading
        title={`${companyName ?? "Tu empresa"} está lista`}
        lead="Esto es lo que dejaste configurado. Lo que quedó para después lo encuentras en el panel, y te lo recordamos hasta que lo termines."
      >
        <ol className="flex w-full max-w-[520px] flex-col gap-1.5 text-left" aria-label="Lo que dejaste configurado">
          {rows.map((row, index) => {
            const Icon = row.icon;
            const done = row.status === "done";
            return (
              <motion.li key={row.code} {...enter(index)} className="sf-glass grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3.5 py-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-8 place-items-center rounded-full border",
                    done ? "flow-stop-badge border-transparent" : "sf-glass sf-line text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.6} /> : <Icon className="size-3.5" strokeWidth={1.9} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] leading-tight font-medium">{row.label}</span>
                  {row.code === "niche" ? <small className="text-muted-foreground block text-xs">{row.value}</small> : null}
                </span>
                {row.code !== "niche" ? (
                  <span className={cn("text-[12.5px] font-semibold", done ? "text-accent-violet" : "text-muted-foreground font-medium")}>{row.value}</span>
                ) : null}
              </motion.li>
            );
          })}
        </ol>

        {entitlements && entitlements.included.length > 0 ? (
          <motion.section
            {...enter(rows.length)}
            aria-label="Qué incluye tu prueba"
            className="border-brand/25 bg-brand/6 flex w-full max-w-[520px] flex-col gap-3 rounded-2xl border p-4 text-left sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-[0.9375rem] font-bold">
                {entitlements.trial.active ? "Tu prueba de 7 días incluye" : `${offerLabel(entitlements)} incluye`}
              </h3>
              {trialEndsLabel(entitlements) ? <span className="text-muted-foreground text-xs">{trialEndsLabel(entitlements)}</span> : null}
            </div>
            <dl className="flex flex-col gap-2">
              {entitlements.included.map((item) => (
                <div key={`${item.metric}-${item.period}`} className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                  <dt className="text-foreground">{item.unit_label}</dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    {item.quantity_display}
                    {item.approx_display ? <span className="text-muted-foreground ml-1.5 font-sans font-normal">≈ {item.approx_display}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            {entitlements.trial.active ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Al continuar con {offerLabel(entitlements)} pasas a las cuotas completas. Lo eliges en Facturación cuando quieras.
              </p>
            ) : null}
          </motion.section>
        ) : null}

        <FlowActions
          type="button"
          label="Ir a mi panel"
          submitting={saving}
          onClick={onFinish}
          error={error}
          microcopy="Puedes volver a cualquier paso desde Ajustes."
          className="mt-2"
        />
      </FlowScreen>
    </div>
  );
}
