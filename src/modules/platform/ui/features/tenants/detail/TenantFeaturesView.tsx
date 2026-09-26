"use client";

/**
 * Tab «Funciones» del detalle de tenant (F1 del programa Cobros, premium P1):
 * qué tiene efectivo, quién lo decide y el control de plataforma.
 *
 * Precedencia: plataforma › tenant › nicho. **Forzar** fija la función (el
 * tenant la ve con candado y no puede cambiarla); **Heredar** borra el override
 * y devuelve la decisión al tenant. Forzar exige motivo: es la única razón por
 * la que esta tabla existe, y queda en Auditoría con el usuario que lo hizo.
 *
 * La escalera «Tipo de negocio → Tenant → Plataforma» marca SOLO el peldaño que
 * manda (`source`): el endpoint no dice qué decidió cada peldaño que no manda,
 * y pintarlo sería inventarlo.
 */
import { useState } from "react";
import { CornerDownRight, Lock, ToggleLeft, ToggleRight } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { BentoLink, InkIsland, Kicker, StatePill } from "@/shared/components/features/bento";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import type { FeatureDetailDTO } from "@/shared/auth/features.store";
import {
  useSetTenantFeatureOverride,
  useTenantFeaturesQuery,
} from "../../../../infrastructure/api/hooks/use-tenant-features";
import { ProblemAlert } from "../../../components/ProblemAlert";

type Control = "inherit" | "on" | "off";

const CONTROL_ITEMS = [
  { value: "inherit" as const, label: "Heredar", icon: CornerDownRight },
  { value: "on" as const, label: "Forzar ON", icon: ToggleRight },
  { value: "off" as const, label: "Forzar OFF", icon: ToggleLeft },
];

/** Motivos que se repiten; un clic los escribe y se pueden completar. */
const QUICK_REASONS = ["Lo pidió el dueño", "Piloto", "Soporte técnico"];

/** El control refleja el override, no el valor efectivo: son cosas distintas. */
function controlOf(feature: FeatureDetailDTO): Control {
  if (feature.source !== "platform") return "inherit";
  return feature.enabled ? "on" : "off";
}

const RUNGS: Array<{ source: FeatureDetailDTO["source"]; label: string }> = [
  { source: "niche", label: "Tipo de negocio" },
  { source: "tenant", label: "Tenant" },
  { source: "platform", label: "Plataforma" },
];

/** Quién decide: los tres peldaños y, marcado en tinta, el que manda. */
function Ladder({ feature }: { feature: FeatureDetailDTO }) {
  const value = feature.enabled ? "Encendida" : "Apagada";
  return (
    <ol className="flex items-center gap-1" aria-label={`Quién decide ${feature.label}`}>
      {RUNGS.map((rung, index) => {
        const wins = feature.source === rung.source;
        return (
          <li key={rung.source} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" className="text-xs text-muted-foreground/60">
                →
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex h-7 min-w-24 items-center justify-center gap-1 rounded-full border px-2.5 text-xs whitespace-nowrap",
                wins ? "border-foreground bg-foreground font-medium text-background" : "border-dashed border-border text-muted-foreground",
              )}
              title={rung.label}
            >
              {wins && rung.source === "platform" ? <Lock aria-hidden="true" className="size-3" /> : null}
              {wins ? value : rung.label}
              {wins ? <span className="sr-only"> · manda {rung.label}</span> : null}
            </span>
          </li>
        );
      })}
      {feature.source === "default" ? <li className="pl-2 text-xs text-muted-foreground">Nadie la decidió: {value.toLowerCase()} de fábrica</li> : null}
    </ol>
  );
}

export function TenantFeaturesView({ tenantId }: { tenantId: string }) {
  const { data, isPending, isError, error, refetch } = useTenantFeaturesQuery(tenantId);
  const override = useSetTenantFeatureOverride(tenantId);
  const { showAlert } = useAlert();
  const [forcing, setForcing] = useState<{ feature: FeatureDetailDTO; forced: "on" | "off" } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  if (isPending) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando funciones del tenant">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }
  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />;

  const apply = async (code: string, forced: "on" | "off" | null, motive?: string) => {
    try {
      await override.mutateAsync({ code, forced, reason: motive });
      setForcing(null);
      setReason("");
      setReasonError(false);
      showAlert({
        tone: "success",
        title: forced === null ? "Override liberado" : `Función forzada ${forced === "on" ? "ON" : "OFF"}`,
        description:
          forced === null
            ? "Vuelve a mandar lo que decida el tenant sobre la sugerencia de su nicho."
            : "El tenant la verá bloqueada con candado. Queda registrado en Auditoría.",
        autoCloseMs: 5000,
      });
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo cambiar la función", description: errorMessage(err) });
    }
  };

  const onControlChange = (feature: FeatureDetailDTO, next: Control) => {
    if (next === "inherit") {
      void apply(feature.code, null);
      return;
    }
    // Forzar pide motivo: sin él el backend responde 400 y, sobre todo, la
    // fila de auditoría no diría por qué.
    setForcing({ feature, forced: next });
    setReason("");
    setReasonError(false);
  };

  const fixed = data.features.filter((feature) => feature.source === "platform");

  return (
    <section className="flex flex-col gap-4" aria-labelledby="tenant-features-title">
      <h2 id="tenant-features-title" className="sr-only">
        Funciones
      </h2>

      <InkIsland label="Fijadas por la plataforma" className="gap-4 sm:flex-row sm:items-center sm:gap-7">
        <div className="flex shrink-0 flex-col gap-1.5">
          <Kicker>Fijadas por la plataforma</Kicker>
          <p className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-heading text-4xl leading-none font-bold tabular-nums">{fixed.length}</span>
            <span className="text-sm text-muted-foreground">de {data.features.length} funciones</span>
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {fixed.length === 0 ? (
            <p className="text-sm text-pretty">Ninguna: manda lo que decida el tenant sobre la sugerencia de su tipo de negocio.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {fixed.map((feature) => (
                <li key={feature.code} className="truncate">
                  <span className="font-medium">{feature.label}</span> · forzada {feature.enabled ? "encendida" : "apagada"}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">El tenant la ve con candado. El motivo queda en Auditoría y el tenant no lo ve.</p>
        </div>
        <BentoLink href={`/platform/tenants/${tenantId}/audit`} className="shrink-0">
          Ver en Auditoría
        </BentoLink>
      </InkIsland>

      <article className="rounded-3xl border border-border bg-card px-5 pt-4 pb-2 md:px-6">
        <div className="flex flex-col gap-1 pb-2">
          <p className="text-xs text-muted-foreground">Quién decide cada función</p>
          <p className="text-sm text-pretty text-foreground/80">
            Manda la de más a la derecha: la plataforma gana al tenant, y el tenant a su tipo de negocio. Cada cambio queda
            en Auditoría.
          </p>
        </div>
        <ul>
          {data.features.map((feature) => (
            <li
              key={feature.code}
              className="grid gap-3 border-t border-border/60 py-4 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center xl:gap-6"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{feature.label}</span>
                  <StatePill tone={feature.enabled ? "success" : "neutral"}>{feature.enabled ? "Encendida" : "Apagada"}</StatePill>
                </div>
                <span className="truncate font-mono text-xs text-muted-foreground">{feature.code}</span>
                {feature.blocked_by !== null ? (
                  <span className="text-xs text-muted-foreground">
                    {feature.blocked_by.kind === "capability"
                      ? `El plan no incluye ${feature.blocked_by.code}`
                      : `Requiere ${feature.blocked_by.code}`}
                  </span>
                ) : null}
              </div>
              <div className="sidebar-scroll overflow-x-auto">
                <Ladder feature={feature} />
              </div>
              <SegmentedControl
                value={controlOf(feature)}
                onValueChange={(next) => onControlChange(feature, next)}
                items={CONTROL_ITEMS}
                label={`Override de ${feature.label}`}
                size="sm"
                surface="inline"
              />
            </li>
          ))}
        </ul>
        <p className="border-t border-border/60 py-3 text-xs text-muted-foreground">
          Heredar borra el override: vuelve a mandar lo que el tenant decida sobre la sugerencia de su nicho.
        </p>
      </article>

      <Modal
        open={forcing !== null}
        onOpenChange={(open) => {
          if (!open) setForcing(null);
        }}
        config={{
          title: forcing === null ? "" : `Forzar ${forcing.forced === "on" ? "ON" : "OFF"} «${forcing.feature.label}»`,
          description:
            forcing?.forced === "off"
              ? "El tenant verá la función bloqueada con candado y no podrá encenderla."
              : "El tenant tendrá la función encendida y no podrá apagarla.",
          body: (
            <div className="space-y-2.5">
              <Label htmlFor="feature-override-reason">Motivo</Label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Motivos frecuentes">
                {QUICK_REASONS.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      setReason(quick);
                      setReasonError(false);
                    }}
                    aria-pressed={reason === quick}
                    className={cn(
                      "h-8 rounded-full border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      reason === quick ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-accent",
                    )}
                  >
                    {quick}
                  </button>
                ))}
              </div>
              <Textarea
                id="feature-override-reason"
                value={reason}
                aria-invalid={reasonError}
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError(false);
                }}
                placeholder="Piloto de PDF aún no habilitado para este tenant"
              />
              {reasonError ? (
                <p className="text-xs text-destructive">Escribe el motivo (mínimo 3 caracteres).</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Obligatorio. El tenant no lo ve; queda en Auditoría junto a tu usuario.
                </p>
              )}
            </div>
          ),
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "feature-override-cancel" },
            {
              label: "Forzar",
              variant: "default",
              asClose: false,
              id: "feature-override-confirm",
              onClick: () => {
                if (forcing === null) return;
                // El motivo es obligatorio: sin él la fila de auditoría no
                // diría por qué, que es lo único que justifica esta tabla.
                if (reason.trim().length < 3) {
                  setReasonError(true);
                  return;
                }
                void apply(forcing.feature.code, forcing.forced, reason.trim());
              },
            },
          ],
        }}
      />
    </section>
  );
}
