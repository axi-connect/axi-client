"use client";

import { useState } from "react";
import {
  ArrowRight,
  BedDouble,
  BriefcaseBusiness,
  GraduationCap,
  HeartPulse,
  Home,
  LoaderCircle,
  Shirt,
  Store,
  Truck,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ProviderCard } from "@/shared/components/features/provider-card";
import { NICHES } from "@/modules/onboarding/domain/niches";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";

/** Mapa cerrado por `code`; un nicho nuevo sin icono cae a la tienda genérica. */
const NICHE_ICONS: Record<string, LucideIcon> = {
  restaurants: Utensils,
  retail_fashion: Shirt,
  hotels_tourism: BedDouble,
  health_beauty: HeartPulse,
  real_estate: Home,
  education: GraduationCap,
  professional_services: BriefcaseBusiness,
  b2b_distribution: Truck,
  other: Store,
};

/** Paso 1 · Negocio. Único paso no omitible: sin nicho no hay plantillas. */
export function NicheStep({
  initial,
  saving,
  error,
  onContinue,
}: {
  initial: string | null;
  saving: boolean;
  error: string | null;
  onContinue: (nicheCode: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(initial);

  return (
    <StepFrame
      stepNumber={1}
      total={5}
      label="Negocio"
      title="Qué tipo de negocio tienes"
      lead="Con esto elegimos las plantillas de agentes, las categorías de tu catálogo y los ejemplos que verás en los siguientes pasos."
      footer={
        <>
          <span className="text-muted-foreground text-xs">Lo puedes cambiar después en Ajustes de empresa.</span>
          <div className="flex flex-col items-end gap-1.5">
            <Button
              size="lg"
              className="h-11"
              disabled={!selected || saving}
              onClick={() => selected && onContinue(selected)}
              aria-describedby={selected ? undefined : "niche-blocker"}
            >
              {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              Continuar
              {!saving ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
            {!selected ? (
              <span id="niche-blocker" className="text-muted-foreground text-xs">
                Elige el tipo de negocio para continuar.
              </span>
            ) : null}
            {error ? (
              <span role="alert" className="text-destructive text-xs">
                {error}
              </span>
            ) : null}
          </div>
        </>
      }
      aside={
        <StepAside
          glyph="metrics"
          title="Para qué sirve"
          text="El nicho decide qué agentes te proponemos y cómo organizamos tu catálogo."
          tips={["Plantillas de agentes afinadas a tu sector", "Categorías y tipos de producto listos", "Ejemplos reales en cada paso"]}
        />
      }
    >
      <div role="radiogroup" aria-label="Tipo de negocio" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NICHES.map((niche) => {
          const Icon = NICHE_ICONS[niche.code] ?? Store;
          return (
            <ProviderCard
              key={niche.code}
              icon={<Icon aria-hidden="true" className="text-brand size-5" />}
              title={niche.name}
              body={niche.description}
              selected={selected === niche.code}
              onClick={() => setSelected(niche.code)}
            />
          );
        })}
      </div>
    </StepFrame>
  );
}
