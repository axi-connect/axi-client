"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Facebook, Instagram } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { PageAsset } from "@/modules/channels/infrastructure/hooks/use-page-signup";

/**
 * Elegir qué página o cuenta conectar (F7).
 *
 * Es un paso que WhatsApp no tiene y que Meta obliga a añadir: su popup de
 * páginas no devuelve identificadores, así que el servidor descubre los activos
 * y aquí el negocio elige entre los suyos.
 *
 * Dos decisiones de producto:
 *
 * - **Con un solo activo se avanza solo.** Un paso con una única opción es un
 *   clic que no informa de nada. Y se avanza UNA vez: la auto-elección va por
 *   ref, no por un efecto que re-dispara con cada render del padre.
 * - **Lo ya tomado se deshabilita CON su motivo.** Una opción gris sin
 *   explicación es un callejón sin salida; y saberlo aquí evita que el usuario
 *   elija, queme el `code` y reciba un error al final. El motivo va junto al
 *   botón, no dentro: un botón deshabilitado no recibe foco y su texto interno
 *   no lo lee nadie con teclado.
 *
 * El grupo es un `radiogroup` de verdad: foco rotatorio (solo la opción
 * seleccionada está en el orden de tabulación) y flechas para moverse.
 */
export function PageAssetPicker({
  assets,
  product,
  connecting,
  onChoose,
}: {
  assets: PageAsset[];
  /** Decide el icono: la cuenta de Instagram o la página de Facebook. */
  product: "instagram" | "messenger";
  connecting: boolean;
  onChoose: (assetId: string) => void;
}) {
  const selectable = assets.filter((asset) => !asset.unavailable);
  const [selected, setSelected] = useState<string | null>(selectable[0]?.asset_id ?? null);
  const autoChosenRef = useRef(false);
  const radiosRef = useRef<Array<HTMLButtonElement | null>>([]);

  const onlyOne = selectable.length === 1 ? selectable[0] : null;
  const onlyOneId = onlyOne?.asset_id ?? null;

  // Con exactamente una opción disponible, no hay nada que decidir
  useEffect(() => {
    if (onlyOneId === null || autoChosenRef.current) return;
    autoChosenRef.current = true;
    onChoose(onlyOneId);
  }, [onlyOneId, onChoose]);

  if (onlyOne !== null) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        Conectando {onlyOne.name}…
      </p>
    );
  }

  const ProductIcon = product === "instagram" ? Instagram : Facebook;
  const selectableIds = selectable.map((asset) => asset.asset_id);

  const moveSelection = (delta: number) => {
    if (selectableIds.length === 0) return;
    const currentIndex = selected === null ? -1 : selectableIds.indexOf(selected);
    const nextIndex =
      (currentIndex + delta + selectableIds.length * 2) % selectableIds.length;
    const nextId = selectableIds[nextIndex];
    setSelected(nextId);
    radiosRef.current[assets.findIndex((asset) => asset.asset_id === nextId)]?.focus();
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Elige qué conectar</h3>
        <p className="text-xs text-muted-foreground">
          Autorizaste varias. Puedes conectar las demás más adelante.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Cuentas autorizadas"
        className="space-y-2"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            event.preventDefault();
            moveSelection(1);
          } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            event.preventDefault();
            moveSelection(-1);
          }
        }}
      >
        {assets.map((asset, index) => {
          const disabled = asset.unavailable;
          const isSelected = selected === asset.asset_id;
          const reasonId = `asset-${asset.asset_id}-reason`;
          const reason = disabled
            ? "Ya está conectada en otra cuenta de Axi"
            : asset.already_connected
              ? "Ya la tienes conectada: al continuar se renueva"
              : null;
          // Foco rotatorio: solo la seleccionada entra por Tab (o la primera
          // disponible si ninguna lo está todavía)
          const tabbable = isSelected || (selected === null && selectableIds[0] === asset.asset_id);
          return (
            <div key={asset.asset_id} className="space-y-1">
              <button
                ref={(node) => {
                  radiosRef.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-describedby={reason === null ? undefined : reasonId}
                tabIndex={disabled ? -1 : tabbable ? 0 : -1}
                disabled={disabled || connecting}
                onClick={() => setSelected(asset.asset_id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                  isSelected ? "border-brand bg-accent" : "border-border hover:bg-secondary",
                  disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
                )}
              >
                <span className="flex-1">
                  <span className="block text-sm font-medium">{asset.name}</span>
                  {asset.username !== null && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <ProductIcon aria-hidden="true" className="size-3" />@{asset.username}
                    </span>
                  )}
                </span>
                {isSelected && <Check aria-hidden="true" className="text-brand size-4" />}
              </button>
              {reason !== null && (
                <p id={reasonId} className="text-muted-foreground px-3 text-xs">
                  {reason}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button
        disabled={selected === null || connecting}
        onClick={() => selected !== null && onChoose(selected)}
      >
        {connecting ? "Conectando…" : "Conectar"}
      </Button>
    </div>
  );
}
