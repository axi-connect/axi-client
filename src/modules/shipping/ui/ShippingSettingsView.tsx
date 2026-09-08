"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ShopifyOriginBadge } from "@/shared/components/ui/status-badges";
import type {
  ShippingRateDTO,
  ShippingSettingsDTO,
  ShippingZoneDTO,
} from "@/modules/shipping/domain/shipping";
import {
  defaultRateValues,
  defaultZoneValues,
  rateToFormValues,
  zoneToFormValues,
  type RateFormValues,
  type ZoneFormValues,
} from "@/modules/shipping/domain/shipping-form";
import {
  deleteShippingRate,
  deleteShippingZone,
  getShippingSettings,
  listShippingZones,
} from "@/modules/shipping/infrastructure/services/shipping-service.adapter";
import { QuotePolicyCard } from "./components/QuotePolicyCard";
import { RateFormSheet } from "./components/RateFormSheet";
import { ZoneCard } from "./components/ZoneCard";
import { ZoneFormSheet } from "./components/ZoneFormSheet";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; zones: ShippingZoneDTO[]; settings: ShippingSettingsDTO }
  | { kind: "error"; message: string };

type Sheet =
  | { kind: "zone"; zone: ShippingZoneDTO | null; values: ZoneFormValues }
  | { kind: "rate"; zone: ShippingZoneDTO; rate: ShippingRateDTO | null; values: RateFormValues };

/**
 * `/settings/shipping` (plan envíos+promos F7): zonas por departamento y
 * tarifas que la IA usa para decir cuánto vale el envío antes de cerrar. Bajo
 * gobierno del proveedor (`settings.governed_by`) todo es de solo lectura: las
 * zonas vienen espejadas y se editan en la tienda.
 */
export function ShippingSettingsView() {
  const { hasPermission } = useAuth();
  const { showAlert, showModal, closeModal } = useAlert();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const load = useCallback(async () => {
    try {
      const [zones, settings] = await Promise.all([listShippingZones(), getShippingSettings()]);
      setState({ kind: "ready", zones, settings });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error, "No se pudieron cargar las zonas de envío") });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const governed = state.kind === "ready" ? state.settings.governed_by : null;
  const canManage = hasPermission("shipping:manage") && governed === null;

  const confirmDelete = (title: string, description: string, action: () => Promise<void>, doneTitle: string) => {
    showModal({
      title,
      description,
      actions: [
        { label: "Cancelar", variant: "outline" },
        {
          label: "Eliminar",
          variant: "destructive",
          // El cierre lo decide el resultado, no el clic (regla keepOpen).
          keepOpen: true,
          onClick: () => {
            action()
              .then(async () => {
                await load();
                showAlert({ tone: "success", title: doneTitle, open: true, autoCloseMs: 3000 });
              })
              .catch((error: unknown) =>
                showAlert({ tone: "error", title: errorMessage(error, "No se pudo eliminar"), open: true }),
              )
              .finally(() => closeModal());
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envíos"
        badge={governed !== null ? <GovernedBadge provider={governed} /> : undefined}
        description={
          governed !== null
            ? "Las zonas y tarifas vienen de tu tienda. Para cambiarlas, edítalas allá: aquí se actualizan solas."
            : "Zonas por departamento y tarifas. La IA las usa para decirle al cliente cuánto vale el envío antes de cerrar."
        }
        actions={
          governed !== null ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/settings/integrations">Ver la integración</Link>
            </Button>
          ) : (
            canManage && (
              <Button className="rounded-full" onClick={() => setSheet({ kind: "zone", zone: null, values: defaultZoneValues() })}>
                <Plus aria-hidden="true" className="size-4" />
                Nueva zona
              </Button>
            )
          )
        }
      />

      {state.kind === "loading" ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Cargando zonas de envío">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : state.kind === "error" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-muted-foreground">{state.message}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-3">
            {state.zones.length === 0 ? (
              <EmptyState
                icon={Truck}
                accent="amber"
                title={governed !== null ? "Tu tienda aún no tiene zonas espejadas" : "Aún no hay zonas de envío"}
                description={
                  governed !== null
                    ? "Cuando la integración lea los perfiles de envío de tu tienda, aparecerán aquí."
                    : "Crea la primera zona con sus departamentos y una tarifa: es lo que la IA necesita para cotizar el envío por chat."
                }
                action={
                  canManage && (
                    <Button variant="outline" className="rounded-full" onClick={() => setSheet({ kind: "zone", zone: null, values: defaultZoneValues() })}>
                      Crear la primera zona
                    </Button>
                  )
                }
              />
            ) : (
              state.zones.map((zone) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  readOnly={!canManage}
                  onEditZone={(target) => setSheet({ kind: "zone", zone: target, values: zoneToFormValues(target) })}
                  onDeleteZone={(target) =>
                    confirmDelete(
                      `¿Eliminar la zona «${target.name}»?`,
                      "Sus tarifas se eliminan con ella. Los pedidos ya cotizados conservan su envío.",
                      () => deleteShippingZone(target.id),
                      "Zona eliminada",
                    )
                  }
                  onAddRate={(target) => setSheet({ kind: "rate", zone: target, rate: null, values: defaultRateValues() })}
                  onEditRate={(target, rate) => setSheet({ kind: "rate", zone: target, rate, values: rateToFormValues(rate) })}
                  onDeleteRate={(_target, rate) =>
                    confirmDelete(
                      `¿Eliminar la tarifa «${rate.name}»?`,
                      "La IA dejará de ofrecerla. Los pedidos ya cotizados conservan su envío.",
                      () => deleteShippingRate(rate.id),
                      "Tarifa eliminada",
                    )
                  }
                />
              ))
            )}
          </div>

          <QuotePolicyCard
            settings={state.settings}
            canManage={hasPermission("shipping:manage")}
            hasZones={state.zones.some((zone) => zone.rates.length > 0)}
            onSaved={(settings) => setState((prev) => (prev.kind === "ready" ? { ...prev, settings } : prev))}
          />
        </div>
      )}

      {sheet?.kind === "zone" ? (
        <ZoneFormSheet
          key={sheet.zone?.id ?? "new-zone"}
          open
          zone={sheet.zone}
          initialValues={sheet.values}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onSaved={() => void load()}
        />
      ) : null}
      {sheet?.kind === "rate" ? (
        <RateFormSheet
          key={sheet.rate?.id ?? `new-rate-${sheet.zone.id}`}
          open
          zone={sheet.zone}
          rate={sheet.rate}
          initialValues={sheet.values}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}

function GovernedBadge({ provider }: { provider: string }) {
  if (provider === "shopify") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        Gobernado por <ShopifyOriginBadge />
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">Gobernado por {provider}</span>;
}
