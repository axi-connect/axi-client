"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { invalidateMyCompanyCache, loadMyCompanyOnce } from "@/modules/companies/public";
import {
  firstOpenStep,
  isOnboardingComplete,
  resolveEntryStep,
  stepIndex,
  type OnboardingStep,
} from "@/modules/onboarding/domain/onboarding-progress";
import { useOnboardingStore } from "@/modules/onboarding/infrastructure/stores/onboarding.store";
import { OnboardingShell } from "@/modules/onboarding/ui/onboarding/OnboardingShell";
import { OnboardingSkeleton } from "@/modules/onboarding/ui/onboarding/OnboardingSkeleton";
import { BusinessHoursStep } from "@/modules/onboarding/ui/onboarding/steps/BusinessHoursStep";
import { DoneStep } from "@/modules/onboarding/ui/onboarding/steps/DoneStep";
import { NicheStep } from "@/modules/onboarding/ui/onboarding/steps/NicheStep";
import { PendingStep } from "@/modules/onboarding/ui/onboarding/steps/PendingStep";

const DASHBOARD_PATH = "/dashboard";

/**
 * Orquestador de `/onboarding` (mockup F0-B, aprobado 2026-09-01).
 *
 * El progreso es del servidor (store Zustand como eco): al montar se carga y
 * se resuelve el paso de entrada — el de `?step=` si es alcanzable, si no el
 * primero abierto; con todo cerrado, la pantalla final. Un onboarding ya
 * completado redirige al panel. Cada paso persiste su cierre antes de avanzar,
 * y un fallo al guardar no pierde lo elegido: se muestra y se reintenta.
 */
export function OnboardingView() {
  const router = useRouter();
  const search = useSearchParams();
  const { showAlert } = useAlert();

  const status = useOnboardingStore((state) => state.status);
  const progress = useOnboardingStore((state) => state.progress);
  const loadError = useOnboardingStore((state) => state.error);
  const saving = useOnboardingStore((state) => state.saving);
  const load = useOnboardingStore((state) => state.load);
  const markDone = useOnboardingStore((state) => state.markDone);
  const skip = useOnboardingStore((state) => state.skip);
  const complete = useOnboardingStore((state) => state.complete);

  const [current, setCurrent] = useState<OnboardingStep | null | undefined>(undefined);
  const [stepError, setStepError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadMyCompanyOnce()
      .then((company) => setCompanyName(company.name))
      .catch(() => {});
  }, []);

  // Paso de entrada: una sola vez, cuando el progreso llega.
  useEffect(() => {
    if (status !== "ready" || !progress || current !== undefined) return;
    if (isOnboardingComplete(progress)) {
      router.replace(DASHBOARD_PATH);
      return;
    }
    setCurrent(resolveEntryStep(progress, search.get("step")));
  }, [status, progress, current, router, search]);

  // Tras cerrar un paso se sigue por el primero abierto: los cerrados no se
  // repiten aunque se haya vuelto a revisar uno anterior. Sin abiertos → final.
  const advance = useCallback(() => {
    const fresh = useOnboardingStore.getState().progress;
    if (!fresh) return;
    setCurrent(firstOpenStep(fresh));
    setStepError(null);
  }, []);

  async function closeStep(action: () => Promise<void>) {
    setStepError(null);
    try {
      await action();
      advance();
    } catch (error) {
      setStepError(errorMessage(error, "No pudimos guardar este paso. Inténtalo de nuevo."));
    }
  }

  async function finish() {
    setStepError(null);
    try {
      await complete();
      invalidateMyCompanyCache();
      router.replace(DASHBOARD_PATH);
    } catch (error) {
      setStepError(errorMessage(error, "No pudimos cerrar la configuración. Inténtalo de nuevo."));
    }
  }

  if (status === "error" && !progress) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-heading text-xl font-bold">No pudimos cargar tu progreso</h1>
        <p className="text-muted-foreground text-sm">{loadError}</p>
        <div className="flex gap-2">
          <Button onClick={() => void load(true)}>Reintentar</Button>
          <Button variant="outline" asChild>
            <Link href={DASHBOARD_PATH}>Ir al panel</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!progress || current === undefined) return <OnboardingSkeleton />;

  return (
    <OnboardingShell progress={progress} current={current} onStepChange={(step) => { setStepError(null); setCurrent(step); }}>
      {current === "niche" ? (
        <NicheStep
          initial={progress.niche_code}
          saving={saving}
          error={stepError}
          onContinue={(nicheCode) =>
            void closeStep(() => markDone("niche", { niche_code: nicheCode }, { niche_code: nicheCode, current_step: "business_hours" }))
          }
        />
      ) : null}
      {current === "business_hours" ? (
        <BusinessHoursStep
          saving={saving}
          onBack={() => setCurrent("niche")}
          onSaved={() => void closeStep(() => markDone("business_hours"))}
          onKeep={() => void closeStep(() => skip("business_hours"))}
          onError={(message) => showAlert({ tone: "error", title: "No se pudo guardar el horario", description: message })}
        />
      ) : null}
      {current === "catalog" || current === "agents" || current === "whatsapp" ? (
        <PendingStep
          step={current}
          stepNumber={stepIndex(current) + 1}
          saving={saving}
          onBack={() => setCurrent(previousOf(current))}
          onSkip={() => void closeStep(() => skip(current))}
        />
      ) : null}
      {current === null ? (
        <DoneStep progress={progress} companyName={companyName} saving={saving} error={stepError} onFinish={() => void finish()} />
      ) : null}
      {stepError && current !== "niche" && current !== null ? (
        <p role="alert" className="text-destructive mt-4 text-sm">
          {stepError}
        </p>
      ) : null}
    </OnboardingShell>
  );
}

function previousOf(step: OnboardingStep): OnboardingStep {
  const order: OnboardingStep[] = ["niche", "business_hours", "catalog", "agents", "whatsapp"];
  return order[Math.max(0, order.indexOf(step) - 1)];
}
