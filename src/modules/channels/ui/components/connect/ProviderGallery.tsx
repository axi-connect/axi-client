"use client";

import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  connectableProviders,
  type ChannelProvider,
} from "@/modules/channels/domain/channel-providers";
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
        // su alta por botón. Solo `coming_soon` queda inerte.
        const isSoon = provider.availability === "coming_soon";
        const isManualOnly = provider.availability === "manual_only";
        const isSelected = selected?.kind === provider.kind;

        return (
          <button
            key={provider.kind}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isSoon}
            tabIndex={isSoon ? -1 : 0}
            data-selected={isSelected}
            onClick={() => {
              if (isSoon) return;
              onSelect(provider);
            }}
            className={cn(
              "channel-surface flex w-full items-start gap-3.5 rounded-lg border border-border bg-background p-4 text-left",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              provider.brand_class,
              isSoon && "cursor-not-allowed opacity-70",
            )}
          >
            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute top-3 right-3 grid size-5.5 place-items-center rounded-full bg-[var(--ch-glow)] text-background"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            )}

            <ChannelProviderIcon iconId={provider.icon_id} className="relative" />
            <span className="relative flex min-w-0 flex-col gap-1.5 pr-6">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{provider.label}</span>
                {provider.recommended === true && (
                  <span className="rounded-full bg-accent-violet/12 px-2 py-0.5 text-xs font-medium text-accent-violet">
                    Recomendado
                  </span>
                )}
                {isSoon && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Muy pronto
                  </span>
                )}
                {isManualOnly && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Requiere credenciales
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">{provider.tagline}</span>
              {provider.requirement_note !== undefined && (
                <span className="text-xs text-muted-foreground">{provider.requirement_note}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
