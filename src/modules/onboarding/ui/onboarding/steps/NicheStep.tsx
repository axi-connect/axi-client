"use client";

import { useState } from "react";

import { NICHES } from "@/modules/onboarding/domain/niches";
import { FlowActions } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";
import { FlowTile } from "@/modules/onboarding/ui/flow/FlowTile";
import { nicheGraphic } from "@/modules/onboarding/ui/onboarding/graphics/NicheGraphics";

/**
 * Paso 1 · Negocio. Único paso no omitible: sin nicho no hay plantillas. Las
 * nueve opciones son fichas «Flow» (las mismas de la oferta del registro) con
 * su gráfico monocromo. La pregunta es el título; el motivo del bloqueo vive
 * bajo el CTA como microcopy y lo describe (`aria-describedby`) mientras no
 * haya elección.
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
      <div role="radiogroup" aria-label="Tipo de negocio" className="grid w-full gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {NICHES.map((niche) => {
          const Graphic = nicheGraphic(niche.code);
          return (
            <FlowTile
              key={niche.code}
              role="radio"
              testId={`niche-${niche.code}`}
              checked={selected === niche.code}
              onClick={() => setSelected(niche.code)}
              title={niche.name}
              description={niche.description}
              graphic={<Graphic />}
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
