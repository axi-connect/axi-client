"use client";

import Link from "next/link";
import { ArrowRight, Inbox, Sparkles } from "lucide-react";

import { formatQuantity, unitLabel } from "@/core/lib/commercial-units";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { ProviderCard } from "@/shared/components/features/provider-card";
import { MODULES, MODULE_ICONS, SBS_TIERS, formatCop } from "@/modules/landing/public";
import {
  SELF_SERVICE_PACKAGES,
  offerBlocker,
  packageBeatsModules,
  packagePlan,
  sbsEntryPriceCop,
  toggleModule,
  type OfferSelection,
  type PackageCode,
} from "@/modules/onboarding/domain/signup-draft";

type OfferKind = "package" | "modules";

const PACKAGE_ICONS: Record<PackageCode, typeof Inbox> = { free_trial: Sparkles, sbs: Inbox };

/**
 * Paso 1 · Oferta. Conmutador Paquete | Módulos (`SegmentedControl`, un
 * radiogroup) y debajo las tarjetas (`ProviderCard`, radio para paquetes y
 * checkbox para módulos: «seleccionado = elevado», nunca teñido). El estado
 * mixto es imposible por tipo; cambiar de pestaña descarta lo otro.
 */
export function OfferStep({
  selection,
  onChange,
  onNext,
}: {
  selection: OfferSelection | null;
  onChange: (next: OfferSelection | null) => void;
  onNext: () => void;
}) {
  const kind: OfferKind = selection?.kind === "modules" ? "modules" : "package";
  const blocker = offerBlocker(selection);
  const suggestPackage = packageBeatsModules(selection);

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl<OfferKind>
        label="Tipo de oferta"
        value={kind}
        onValueChange={(next) => onChange(next === "package" ? null : { kind: "modules", codes: [] })}
        items={[
          { value: "package", label: "Paquete" },
          { value: "modules", label: "Módulos" },
        ]}
        surface="inline"
      />

      {kind === "package" ? (
        <div role="radiogroup" aria-label="Paquetes" className="grid gap-3 sm:grid-cols-2">
          {SELF_SERVICE_PACKAGES.map((code) => {
            const plan = packagePlan(code);
            const Icon = PACKAGE_ICONS[code];
            const metrics =
              code === "sbs"
                ? [
                    { label: "Volumen", value: SBS_TIERS[0].volumeBullet },
                    { label: "Tras la prueba", value: `${formatCop(sbsEntryPriceCop())} COP/mes` },
                  ]
                : [
                    { label: "Prueba", value: "7 días gratis" },
                    { label: "Después", value: "Eliges tu plan" },
                  ];
            return (
              <ProviderCard
                key={code}
                icon={<Icon aria-hidden="true" className="text-brand size-5" />}
                title={plan.name}
                subtitle={plan.badge ?? plan.priceUnit ?? undefined}
                badge={plan.badge ? <Badge className="relative">{plan.badge}</Badge> : undefined}
                body={plan.tagline}
                metrics={metrics}
                selected={selection?.kind === "package" && selection.code === code}
                onClick={() => onChange({ kind: "package", code })}
              />
            );
          })}
        </div>
      ) : (
        <div role="group" aria-label="Módulos" className="grid gap-3 sm:grid-cols-2">
          {MODULES.map((offer) => {
            const Icon = MODULE_ICONS[offer.id];
            const checked = selection?.kind === "modules" && selection.codes.includes(offer.id);
            return (
              <ProviderCard
                key={offer.id}
                icon={<Icon aria-hidden="true" className="text-brand size-5" />}
                title={offer.name}
                subtitle={`${formatCop(offer.listCop)} COP/mes tras la prueba`}
                metrics={[
                  {
                    label: unitLabel(offer.allowance.unit, offer.allowance.quantity),
                    value: `${offer.allowance.quantity} al mes`,
                  },
                  offer.allowance.equivalent
                    ? {
                        label: "Equivale a",
                        value: formatQuantity(offer.allowance.equivalent.quantity, offer.allowance.equivalent.unit),
                      }
                    : { label: "Incluye", value: offer.extras },
                ]}
                selected={checked}
                selectionRole="checkbox"
                onClick={() => onChange(toggleModule(selection, offer.id))}
              />
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground text-[0.8125rem] leading-relaxed">
        Los Módulos se contratan sueltos y no se combinan con un Paquete. Todo empieza con 7 días de prueba sin tarjeta.
      </p>

      {suggestPackage ? (
        <p
          role="note"
          className="border-accent-violet/35 bg-accent-violet/8 rounded-xl border px-4 py-3 text-sm leading-relaxed"
        >
          Con dos o más módulos, <strong>Small Business Suite</strong> sale mejor y trae el producto completo.{" "}
          <Link href="/precios#planes" className="text-brand font-medium hover:underline">
            Comparar
          </Link>
        </p>
      ) : null}

      <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <span className="text-muted-foreground text-xs">Paso 1 de 3</span>
        <div className="flex flex-col items-end gap-1.5">
          <Button size="lg" className="h-11" onClick={onNext} disabled={blocker !== null} aria-describedby="offer-blocker">
            Continuar
            <ArrowRight aria-hidden="true" />
          </Button>
          {blocker ? (
            <span id="offer-blocker" className="text-muted-foreground text-xs">
              {blocker}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
