"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useSession } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { invalidateMyCompanyCache, loadMyCompanyOnce } from "@/modules/companies/public";
import {
  ONBOARDING_PATH,
  WELCOME_QUERY,
  firstOpenStep,
  stepStatus,
  isFreshProgress,
  isOnboardingComplete,
  resolveEntryStep,
  type OnboardingStep,
} from "@/modules/onboarding/domain/onboarding-progress";
import { useOnboardingStore } from "@/modules/onboarding/infrastructure/stores/onboarding.store";
import { OnboardingShell } from "@/modules/onboarding/ui/onboarding/OnboardingShell";
import { OnboardingSkeleton } from "@/modules/onboarding/ui/onboarding/OnboardingSkeleton";
import { WelcomeView } from "@/modules/onboarding/ui/onboarding/WelcomeView";
import { BusinessHoursStep } from "@/modules/onboarding/ui/onboarding/steps/BusinessHoursStep";
import { AgentTemplatesStep } from "@/modules/onboarding/ui/onboarding/steps/AgentTemplatesStep";
import { CatalogImportStep } from "@/modules/onboarding/ui/onboarding/steps/CatalogImportStep";
import { DoneStep } from "@/modules/onboarding/ui/onboarding/steps/DoneStep";
import { NicheStep } from "@/modules/onboarding/ui/onboarding/steps/NicheStep";
import { WhatsAppStep } from "@/modules/onboarding/ui/onboarding/steps/WhatsAppStep";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";

const DASHBOARD_PATH = "/dashboard";

/**
 * Orquestador de `/onboarding` (mockup F0-B, aprobado 2026-09-01).
 *
 * El progreso es del servidor (store Zustand como eco): al montar se carga y
 * se resuelve el paso de entrada — el de `?step=` si es alcanzable, si no el
 * primero abierto; con todo cerrado, la pantalla final. Un onboarding ya
 * completado redirige al panel. Cada paso persiste su cierre antes de avanzar,
 * y un fallo al guardar no pierde lo elegido: se muestra y se reintenta.
 *
 * Con `?welcome=1` (lo pone el registro al crear la cuenta) y un progreso
 * recién nacido se antepone la bienvenida; si ya hay algo cerrado, el query se
 * ignora: una recarga a mitad de camino vuelve al paso, no a la fiesta.
 */
export function OnboardingView() {
  const router = useRouter();
  const search = useSearchParams();
  const { showAlert } = useAlert();
  const { user } = useSession();

  const status = useOnboardingStore((state) => state.status);
  const progress = useOnboardingStore((state) => state.progress);
  const loadError = useOnboardingStore((state) => state.error);
  const saving = useOnboardingStore((state) => state.saving);
  const load = useOnboardingStore((state) => state.load);
  const markDone = useOnboardingStore((state) => state.markDone);
  const skip = useOnboardingStore((state) => state.skip);
  const complete = useOnboardingStore((state) => state.complete);
  const update = useOnboardingStore((state) => state.update);

  const [current, setCurrent] = useState<OnboardingStep | null | undefined>(undefined);
  const { hasCapability, loaded: entitlementsLoaded } = useEntitlements();
  const catalogAutoSkipped = useRef(false);
  const [welcome, setWelcome] = useState(false);
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
    const showWelcome = search.get(WELCOME_QUERY) === "1" && isFreshProgress(progress);
    setWelcome(showWelcome);
    setCurrent(resolveEntryStep(progress, showWelcome ? null : search.get("step")));
  }, [status, progress, current, router, search]);

  // Sin la capacidad `sales` (módulos Llamadas, Captación, CRM) no hay catálogo
  // que importar: el paso se cierra solo como omitido y el recorrido sigue. El
  // backend además gatea `POST /catalog/imports`, así que dejarlo abierto sería
  // invitar a un 403 (auditoría 2026-09-03, Fase 4).
  useEffect(() => {
    if (status !== "ready" || !progress || !entitlementsLoaded || catalogAutoSkipped.current) return;
    if (hasCapability("sales") || stepStatus(progress, "catalog") !== "pending") return;
    catalogAutoSkipped.current = true;
    void skip("catalog")
      .then(() => {
        if (useOnboardingStore.getState().progress && current === "catalog") {
          setCurrent(firstOpenStep(useOnboardingStore.getState().progress!));
        }
      })
      .catch(() => {
        catalogAutoSkipped.current = false;
      });
  }, [status, progress, entitlementsLoaded, hasCapability, skip, current]);

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

  if (welcome) {
    return (
      <WelcomeView
        firstName={firstNameOf(user?.name)}
        companyName={companyName}
        onStart={() => {
          setWelcome(false);
          // Limpia el query: volver atrás o recargar ya no reabre la bienvenida.
          router.replace(ONBOARDING_PATH);
        }}
      />
    );
  }

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
      {current === "catalog" ? (
        <CatalogImportStep
          nicheCode={progress.niche_code}
          initialImportId={readImportId(progress.steps.catalog?.data)}
          saving={saving}
          onBack={() => setCurrent("business_hours")}
          onSkip={() => void closeStep(() => skip("catalog"))}
          onImportStarted={(importId) => void update({ steps: { catalog: { status: "pending", data: { import_id: importId } } } }).catch(() => {})}
          onDone={(result) => void closeStep(() => markDone("catalog", result))}
        />
      ) : null}
      {current === "agents" ? (
        <AgentTemplatesStep
          nicheCode={progress.niche_code}
          companyName={companyName}
          saving={saving}
          onBack={() => setCurrent("catalog")}
          onSkip={() => void closeStep(() => skip("agents"))}
          onDone={(result) => void closeStep(() => markDone("agents", result))}
        />
      ) : null}
      {current === "whatsapp" ? (
        <WhatsAppStep
          saving={saving}
          onBack={() => setCurrent("agents")}
          onSkip={() => void closeStep(() => skip("whatsapp"))}
          onDone={(result) => void closeStep(() => markDone("whatsapp", result))}
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

/** Primer nombre para el saludo; `null` si no hay nombre utilizable. */
function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/** `steps.catalog.data.import_id`, si el progreso guardó un job para reanudar. */
function readImportId(data: Record<string, unknown> | undefined): string | null {
  const value = data?.import_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

