"use client";

/**
 * Tab «Funciones» del detalle de tenant (F1 del programa Cobros): qué tiene
 * efectivo, de dónde sale y el control de plataforma.
 *
 * Precedencia: plataforma › tenant › nicho. **Forzar** fija la función (el
 * tenant la ve con candado y no puede cambiarla); **Heredar** borra el override
 * y devuelve la decisión al tenant. Forzar exige motivo: es la única razón por
 * la que esta tabla existe, y queda en Auditoría con el usuario que lo hizo.
 */
import { useState } from "react";
import { CornerDownRight, Lock, SlidersHorizontal, ToggleLeft, ToggleRight } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { Modal } from "@/shared/components/ui/modal";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
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

/** El control refleja el override, no el valor efectivo: son cosas distintas. */
function controlOf(feature: FeatureDetailDTO): Control {
  if (feature.source !== "platform") return "inherit";
  return feature.enabled ? "on" : "off";
}

function OriginBadge({ feature }: { feature: FeatureDetailDTO }) {
  if (feature.source === "platform") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Lock aria-hidden="true" className="size-3" />
        Plataforma
      </Badge>
    );
  }
  const label = feature.source === "tenant" ? "Tenant" : feature.source === "niche" ? "Nicho" : "Sin decidir";
  return <Badge variant="secondary">{label}</Badge>;
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
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-40 rounded-2xl" />
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

  return (
    <section className="rounded-2xl border border-border bg-background p-5 md:p-6" aria-labelledby="tenant-features-title">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="tenant-features-title" className="flex items-center gap-2 text-lg font-medium">
            <SlidersHorizontal aria-hidden="true" className="size-[18px] text-muted-foreground" />
            Funciones
          </h2>
          <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
            Lo efectivo para este tenant y de dónde sale (plataforma › tenant › nicho). <strong className="font-medium">Forzar</strong>{" "}
            fija la función: el tenant la ve con candado y no puede cambiarla. Cada cambio queda en Auditoría.
          </p>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="px-3.5 py-2.5 font-medium">Función</th>
              <th className="px-3.5 py-2.5 font-medium">Efectiva</th>
              <th className="px-3.5 py-2.5 font-medium">Origen</th>
              <th className="px-3.5 py-2.5 font-medium">Control de plataforma</th>
            </tr>
          </thead>
          <tbody>
            {data.features.map((feature) => (
              <tr key={feature.code} className="border-b border-border/40 last:border-b-0">
                <td className="px-3.5 py-3">
                  <span className="font-medium">{feature.label}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{feature.code}</span>
                </td>
                <td className="px-3.5 py-3">
                  <StatusDotBadge tone={feature.enabled ? "ok" : "off"}>
                    {feature.enabled ? "Encendida" : "Apagada"}
                  </StatusDotBadge>
                  {feature.blocked_by !== null ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {feature.blocked_by.kind === "capability"
                        ? `El plan no incluye ${feature.blocked_by.code}`
                        : `Requiere ${feature.blocked_by.code}`}
                    </span>
                  ) : null}
                </td>
                <td className="px-3.5 py-3">
                  <OriginBadge feature={feature} />
                </td>
                <td className="px-3.5 py-3">
                  <SegmentedControl
                    value={controlOf(feature)}
                    onValueChange={(next) => onControlChange(feature, next)}
                    items={CONTROL_ITEMS}
                    label={`Override de ${feature.label}`}
                    size="sm"
                    surface="inline"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Heredar borra el override: vuelve a mandar lo que el tenant decida sobre la sugerencia de su nicho.
      </p>

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
            <div className="space-y-2">
              <Label htmlFor="feature-override-reason">Motivo</Label>
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
