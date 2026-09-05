"use client";

import { useState } from "react";
import {
  BedDouble,
  BriefcaseBusiness,
  GraduationCap,
  HeartPulse,
  Home,
  Shirt,
  Store,
  Truck,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { ProviderCard } from "@/shared/components/features/provider-card";
import { NICHES } from "@/modules/onboarding/domain/niches";
import { FlowActions } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";

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

/**
 * Paso 1 · Negocio. Único paso no omitible: sin nicho no hay plantillas. La
 * pregunta es el título; el motivo del bloqueo vive bajo el CTA como microcopy
 * y lo describe (`aria-describedby`) mientras no haya elección.
 */
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
    <FlowScreen
      size="wide"
      focusHeading
      title="¿Qué tipo de negocio tienes?"
      lead="Con esto afinamos las plantillas de agentes, las categorías de tu catálogo y los ejemplos que verás en los siguientes pasos."
    >
      <div role="radiogroup" aria-label="Tipo de negocio" className="grid w-full gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
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
      <FlowActions
        type="button"
        label="Continuar"
        submitting={saving}
        disabled={!selected}
        onClick={() => selected && onContinue(selected)}
        describedBy={selected ? undefined : "niche-blocker"}
        microcopyId="niche-blocker"
        microcopy={selected ? "Lo puedes cambiar después en Ajustes de empresa." : "Elige el tipo de negocio para continuar."}
        error={error}
        className="mt-2"
      />
    </FlowScreen>
  );
}
