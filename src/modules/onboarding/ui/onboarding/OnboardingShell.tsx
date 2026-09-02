"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { MailWarning } from "lucide-react";

import { useSession } from "@/shared/auth/auth.hooks";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { Button } from "@/shared/components/ui/button";
import { StepIndicator } from "@/shared/components/ui/step-indicator";
import { loadMyCompanyOnce } from "@/modules/companies/public";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  canJumpTo,
  progressPercent,
  stepIndex,
  type OnboardingProgressDTO,
  type OnboardingStep,
} from "@/modules/onboarding/domain/onboarding-progress";

// CONTRACT: `MeDto.email_verified` llega con B2. Hasta entonces el campo es
// opcional y, si no viene, no se muestra el aviso.
type MeWithVerification = { email?: string; email_verified?: boolean };

/**
 * Cromo de `/onboarding`: cabecera con el nombre de la empresa, barra de
 * progreso con el gradiente corto de marca y el indicador de pasos (hacia atrás
 * y al primero abierto). «Guardar y salir» siempre a la vista: el progreso ya
 * está en el servidor, así que salir nunca pierde nada.
 */
export function OnboardingShell({
  progress,
  current,
  onStepChange,
  children,
}: {
  progress: OnboardingProgressDTO;
  /** `null` = pantalla final («Listo»). */
  current: OnboardingStep | null;
  onStepChange: (step: OnboardingStep) => void;
  children: ReactNode;
}) {
  const { user } = useSession();
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMyCompanyOnce()
      .then((company) => {
        if (!cancelled) setCompanyName(company.name);
      })
      .catch(() => {
        /* el nombre es cortesía: sin él el shell sigue */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const percent = progressPercent(progress);
  const currentIndex = current ? stepIndex(current) : ONBOARDING_STEPS.length;
  const verification = user as MeWithVerification | null;
  const showEmailNotice = verification?.email_verified === false;

  return (
    <div className="bg-brand-ambient flex min-h-svh w-full flex-col">
      <div className="border-border/60 relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--axi-brand)_10%,transparent),color-mix(in_srgb,var(--axi-amber)_7%,transparent),color-mix(in_srgb,var(--axi-violet)_10%,transparent))] [mask-image:linear-gradient(180deg,#000,transparent)]"
        />
        <div className="relative mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-6 pt-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <BrandMark className="size-8" />
              <div>
                <h1 className="font-heading text-xl leading-tight font-bold tracking-tight">
                  Configura {companyName ?? "tu empresa"}
                </h1>
                <p className="text-muted-foreground text-xs">
                  {current ? `Paso ${currentIndex + 1} de ${ONBOARDING_STEPS.length} · ${ONBOARDING_STEP_LABELS[currentIndex]}` : "Todo listo"}
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Guardar y salir al panel</Link>
            </Button>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={current ? `Paso ${currentIndex + 1} de ${ONBOARDING_STEPS.length}` : "Completado"}
            className="bg-primary/20 relative h-2 overflow-hidden rounded-full"
          >
            <div
              className="bg-brand-gradient absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${Math.max(percent, 4)}%` }}
            />
          </div>

          <StepIndicator
            steps={ONBOARDING_STEP_LABELS}
            current={currentIndex}
            onStepClick={(index) => {
              const step = ONBOARDING_STEPS[index]?.code;
              if (step && canJumpTo(step, progress)) onStepChange(step);
            }}
            ariaLabel="Pasos de la configuración"
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 pt-7 pb-24">
        {showEmailNotice ? (
          <p role="status" className="border-warning/40 bg-warning/10 mb-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed">
            <MailWarning aria-hidden="true" className="text-warning mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Verifica tu correo</strong> para conectar canales e invitar a tu equipo. Te enviamos el enlace a{" "}
              {verification?.email ?? "tu correo"}.
            </span>
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
