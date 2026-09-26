"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, TriangleAlert } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuthContext } from "@/core/providers/auth-provider";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { useFeatures } from "@/shared/auth/features.hooks";
import { useFeaturesStore } from "@/shared/auth/features.store";
import { BentoLink, InkIsland, Kicker, StatePill } from "@/shared/components/features/bento";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { nicheByCode } from "@/modules/onboarding/public";
import { setupSummary, type FeatureSetup, type SetupSummary } from "@/modules/companies/domain/cobros-setup";
import { useCobrosSetup } from "@/modules/companies/infrastructure/hooks/use-cobros-setup";
import { useMyCompany } from "@/modules/companies/infrastructure/hooks/use-my-company";
import { setTenantFeature } from "@/modules/companies/infrastructure/services/features-service.adapter";
import { FeatureSwitchRow } from "./FeatureSwitchRow";

/** Skeleton con la forma del bento: nunca pintar-y-quitar. */
function FeaturesSkeleton() {
  return (
    <div role="status" aria-label="Cargando funciones" className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-28 rounded-3xl md:col-span-2" />
      {[0, 1, 2, 3].map((tile) => (
        <Skeleton key={tile} className="h-56 rounded-3xl" />
      ))}
    </div>
  );
}

/**
 * La isla de la pestaña (§9.5.1, cristal por defecto): lo que falta para
 * cobrar con lo que está encendido. Mientras se leen los ajustes no se pinta
 * el pendiente (§9.5: la acción que depende de un dato no aparece antes que él).
 */
function SetupIsland({ summary, loaded }: { summary: SetupSummary; loaded: boolean }) {
  const total = summary.steps.length;
  const title =
    total === 0 ? "Nada encendido" : summary.next !== null ? summary.next.missing : "Todo listo para cobrar";
  const body =
    total === 0
      ? "Enciende Planes de pago para vender con anticipo y cuotas."
      : summary.next !== null
        ? `${summary.next.foot}. ${summary.next.consequence}`
        : "Lo que encendiste ya está configurado.";

  return (
    <InkIsland label="Puesta en marcha de cobros" className="gap-5 md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-3 xl:row-start-1">
      <div className="flex flex-col gap-2">
        <Kicker>Puesta en marcha de cobros</Kicker>
        {loaded ? (
          <>
            <p className="font-heading text-2xl leading-tight font-bold tracking-tight">{title}</p>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{body}</p>
          </>
        ) : (
          <div role="status" aria-label="Revisando la configuración" className="space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
      </div>
      {loaded && total > 0 ? (
        <>
          <div className="flex flex-col gap-2.5">
            <p className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="font-heading text-5xl leading-none font-bold tracking-tight tabular-nums">{summary.ready}</span>
              <span className="text-sm text-muted-foreground">de {total} listas</span>
            </p>
            <div className="flex gap-1.5" aria-hidden="true">
              {summary.steps.map((step) => (
                <span
                  key={step.code}
                  className={cn("h-1.5 flex-1 rounded-full", step.configured === true ? "bg-foreground" : "bg-foreground/15")}
                />
              ))}
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {summary.steps.map((step) => (
              <SetupStep key={step.code} step={step} />
            ))}
          </ul>
          {summary.next !== null ? (
            <Button asChild variant="contrast" className="mt-auto w-full">
              <Link href={summary.next.href}>{summary.next.cta}</Link>
            </Button>
          ) : null}
        </>
      ) : null}
    </InkIsland>
  );
}

function SetupStep({ step }: { step: FeatureSetup }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          // Dentro de una isla no se usa text-background (§9.5.1): el check va en tinta sobre el tono apagado.
          step.configured === true ? "bg-muted text-foreground" : "border-[1.5px] border-foreground/30",
        )}
      >
        {step.configured === true ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{step.step}</span>
        <span className="truncate text-xs text-muted-foreground" title={step.foot}>
          {step.foot}
        </span>
      </span>
    </li>
  );
}

/**
 * Pestaña «Funciones» de Mi empresa (F1 del programa Cobros, premium P1): el
 * nicho propone, el tenant decide, Axi puede fijar. Lee `GET /me/features` por
 * el store compartido —el mismo que gatea las pestañas del hub Pagos— y
 * escribe con `PUT /features/:code`.
 *
 * La respuesta del PUT trae la lista entera ya resuelta porque una función
 * puede arrastrar a otra (las dependencias son fail-closed): se repinta con lo
 * que diga el servidor.
 */
export function FeaturesTab() {
  const { features, loaded, refresh } = useFeatures();
  const { company } = useMyCompany();
  const { hasPermission } = useAuthContext();
  const { loaded: entitlementsLoaded, hasCapability } = useEntitlements();
  const { showAlert } = useAlert();
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const canManage = hasPermission("features:manage");
  const missingSales = entitlementsLoaded && !hasCapability("sales");
  const labelOf = (code: string) => features?.find((row) => row.code === code)?.label ?? code;
  const activeCodes = (features ?? []).filter((row) => row.enabled && row.blocked_by === null).map((row) => row.code);
  const { sources, loaded: setupLoaded } = useCobrosSetup(activeCodes);
  const summary = setupSummary(activeCodes, sources);
  const setupOf = (code: string) => (setupLoaded ? summary.steps.find((step) => step.code === code) : undefined);
  const nicheCode = company?.niche_code ?? null;
  const niche = nicheByCode(nicheCode);

  const toggle = async (code: string, enabled: boolean) => {
    setPendingCode(code);
    try {
      const payload = await setTenantFeature(code, enabled);
      useFeaturesStore.setState({ features: payload.features, status: "ready" });
    } catch (error) {
      if (isHttpError(error) && error.is(API_ERROR_CODES.featureLockedByPlatform)) {
        showAlert({
          tone: "error",
          title: "Axi fijó esta función",
          description: "No se puede cambiar desde aquí. Escríbenos si la necesitas.",
        });
      } else {
        showAlert({ tone: "error", title: errorMessage(error, "No se pudo cambiar la función") });
      }
      await refresh();
    } finally {
      setPendingCode(null);
    }
  };

  return (
    <section aria-labelledby="features-title" className="flex flex-col gap-4">
      <h2 id="features-title" className="sr-only">
        Funciones
      </h2>

      {missingSales ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>
            <span>
              Tu plan no incluye <strong className="font-medium">Ventas</strong>. Las funciones de cobro dependen de esa
              capacidad: puedes verlas, pero no encenderlas.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {!loaded ? (
        <FeaturesSkeleton />
      ) : features === null || features.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No pudimos cargar las funciones. Recarga la página o vuelve a intentarlo.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-[repeat(2,minmax(0,1fr))_minmax(17rem,20rem)] [&>*]:min-w-0">
          <article className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center md:col-span-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Tu tipo de negocio</p>
              <p className="font-heading text-2xl leading-tight font-bold tracking-tight">
                {niche?.name ?? "Sin tipo de negocio"}
              </p>
              <p className="text-sm text-pretty text-foreground/80">
                {niche === null
                  ? "Elígelo en General: decide qué funciones se te sugieren. Tú decides cuáles usas."
                  : "Tu tipo de negocio sugiere unas funciones; tú decides cuáles usas. Las marcadas con candado las fijó Axi."}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <span className="flex">
                <StatePill tone={activeCodes.length > 0 ? "success" : "neutral"}>
                  {activeCodes.length} de {features.length} encendidas
                </StatePill>
              </span>
              <BentoLink href="/settings/company">Cambiar el tipo de negocio</BentoLink>
            </div>
          </article>

          <SetupIsland summary={summary} loaded={setupLoaded} />

          {features.map((feature) => (
            <FeatureSwitchRow
              key={feature.code}
              feature={feature}
              nicheCode={nicheCode}
              canManage={canManage}
              pending={pendingCode === feature.code}
              labelOf={labelOf}
              onToggle={(enabled) => void toggle(feature.code, enabled)}
              setup={setupOf(feature.code)}
            />
          ))}
        </div>
      )}

      <p className="px-1 text-xs text-muted-foreground">
        Todas requieren la capacidad <strong className="font-medium">Ventas</strong> de tu plan.
      </p>
    </section>
  );
}
