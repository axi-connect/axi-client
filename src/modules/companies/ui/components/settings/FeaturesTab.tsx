"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, SlidersHorizontal, TriangleAlert } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuthContext } from "@/core/providers/auth-provider";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { useFeatures } from "@/shared/auth/features.hooks";
import { useFeaturesStore } from "@/shared/auth/features.store";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useMyCompany } from "@/modules/companies/infrastructure/hooks/use-my-company";
import { setTenantFeature } from "@/modules/companies/infrastructure/services/features-service.adapter";
import { FeatureSwitchRow } from "./FeatureSwitchRow";

/** Skeleton con la forma de las filas: nunca pintar-y-quitar. */
function FeaturesSkeleton() {
  return (
    <div role="status" aria-label="Cargando funciones" className="space-y-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-start gap-4 border-b border-border/60 py-4 last:border-b-0">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-full max-w-md" />
            <Skeleton className="h-5 w-40 rounded-full" />
          </div>
          <Skeleton className="h-[18px] w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Pestaña «Funciones» de Mi empresa (F1 del programa Cobros): el nicho propone,
 * el tenant decide, Axi puede fijar. Lee `GET /me/features` por el store
 * compartido —el mismo que gatea las pestañas del hub Pagos— y escribe con
 * `PUT /features/:code`.
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
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6" aria-labelledby="features-title">
      <div className="mb-4">
        <h2 id="features-title" className="flex items-center gap-2 text-lg font-medium">
          <SlidersHorizontal aria-hidden="true" className="size-[18px]" />
          Funciones
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
          Lo que tu negocio tiene encendido. Tu <strong className="font-medium">tipo de negocio</strong> sugiere unas;
          tú decides cuáles usas. Las marcadas con candado las fijó Axi.
        </p>
      </div>

      {missingSales ? (
        <div className="mb-4 grid grid-cols-[20px_1fr] gap-2.5 rounded-xl border border-border bg-secondary p-3 text-sm">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-[18px] text-warning" />
          <p>
            Tu plan no incluye <strong className="font-medium">Ventas</strong>. Las funciones de cobro dependen de esa
            capacidad: puedes verlas, pero no encenderlas.
          </p>
        </div>
      ) : null}

      {!loaded ? (
        <FeaturesSkeleton />
      ) : features === null || features.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No pudimos cargar las funciones. Recarga la página o vuelve a intentarlo.
        </p>
      ) : (
        <div>
          {features.map((feature) => (
            <FeatureSwitchRow
              key={feature.code}
              feature={feature}
              nicheCode={company?.niche_code ?? null}
              canManage={canManage}
              pending={pendingCode === feature.code}
              labelOf={labelOf}
              onToggle={(enabled) => void toggle(feature.code, enabled)}
            />
          ))}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Info aria-hidden="true" className="size-3.5" />
          Todas requieren la capacidad <strong className="font-medium">Ventas</strong> de tu plan.
        </span>
        <Link href="/settings/company" className="font-medium text-foreground underline-offset-4 hover:underline">
          Cambiar el tipo de negocio
        </Link>
      </footer>
    </section>
  );
}
