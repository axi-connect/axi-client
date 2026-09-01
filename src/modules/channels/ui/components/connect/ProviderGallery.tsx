"use client";


import {
  connectableProviders,
  type ChannelProvider,
} from "@/modules/channels/domain/channel-providers";
import {
  ProviderCard,
  type ProviderBrand,
} from "@/shared/components/features/provider-card";

import { ChannelProviderIcon } from "../ChannelProviderIcon";

/**
 * Paso 1 del wizard: qué se quiere conectar.
 *
 * Se renderiza **desde el registry**, no desde una lista escrita a mano. Añadir
 * Instagram en F5 es cambiar su `availability` en `channel-providers.ts`, y ese
 * es el criterio de éxito medible de esa fase.
 *
 * Los `coming_soon` **no se ocultan**: comunican hoja de ruta, que es información
 * comercial útil. Lo que se les quita es la capacidad de ser elegidos.
 *
 * Es un grupo de radio de verdad (`role="radio"` + `aria-checked`), no botones con
 * `aria-pressed`: la marca de verificación es el afijo visual del estado, no su
 * única expresión.
 */
export function ProviderGallery({
  selected,
  onSelect,
}: {
  selected: ChannelProvider | null;
  onSelect: (provider: ChannelProvider) => void;
}) {
  const providers = connectableProviders();

  return (
    <div
      role="radiogroup"
      aria-label="Canal que quieres conectar"
      className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]"
    >
      {providers.map((provider) => {
        // `manual_only` SÍ se puede elegir: el canal funciona, lo que falta es
        // su alta por botón. Solo `coming_soon` queda vetado.
        const isSoon = provider.availability === "coming_soon";
        const isManualOnly = provider.availability === "manual_only";
        const isSelected = selected?.kind === provider.kind;

        return (
          <ProviderCard
            key={provider.kind}
            brand={provider.brand_class.replace("brand-", "") as ProviderBrand}
            icon={<ChannelProviderIcon iconId={provider.icon_id} bare />}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {provider.label}
                {provider.recommended === true && (
                  <span className="bg-accent-violet/12 text-accent-violet rounded-full px-2 py-0.5 text-xs font-medium">
                    Recomendado
                  </span>
                )}
                {isSoon && (
                  <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    Muy pronto
                  </span>
                )}
                {isManualOnly && (
                  <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    Requiere credenciales
                  </span>
                )}
              </span>
            }
            body={provider.tagline}
            footnote={provider.requirement_note}
            selected={isSelected}
            disabled={isSoon}
            onClick={() => onSelect(provider)}
          />
        );
      })}
    </div>
  );
}
