"use client";

import { useEffect, useState } from "react";
import { Check, Instagram } from "lucide-react";

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
 *   clic que no informa de nada.
 * - **Lo ya tomado se deshabilita CON su motivo.** Una opción gris sin
 *   explicación es un callejón sin salida; y saberlo aquí evita que el usuario
 *   elija, queme el `code` y reciba un error al final.
 */
export function PageAssetPicker({
  assets,
  connecting,
  onChoose,
}: {
  assets: PageAsset[];
  connecting: boolean;
  onChoose: (assetId: string) => void;
}) {
  const selectable = assets.filter((asset) => !asset.unavailable);
  const [selected, setSelected] = useState<string | null>(selectable[0]?.asset_id ?? null);

  // Con exactamente una opción disponible, no hay nada que decidir
  useEffect(() => {
    if (selectable.length === 1 && !connecting) {
      onChoose(selectable[0].asset_id);
    }
    // Solo al recibir la lista: `onChoose` cambia de identidad en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  if (selectable.length === 1) {
    return <p className="text-sm text-muted-foreground">Conectando {selectable[0].name}…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Elige qué conectar</h3>
        <p className="text-xs text-muted-foreground">
          Autorizaste varias. Puedes conectar las demás más adelante.
        </p>
      </div>

      <ul className="space-y-2" role="radiogroup" aria-label="Cuentas autorizadas">
        {assets.map((asset) => {
          const disabled = asset.unavailable;
          const isSelected = selected === asset.asset_id;
          return (
            <li key={asset.asset_id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
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
                      <Instagram aria-hidden="true" className="size-3" />@{asset.username}
                    </span>
                  )}
                  {disabled && (
                    <span className="text-muted-foreground block text-xs">
                      Ya está conectada en otra cuenta de Axi
                    </span>
                  )}
                  {asset.already_connected && !disabled && (
                    <span className="text-muted-foreground block text-xs">
                      Ya la tienes conectada: al continuar se renueva
                    </span>
                  )}
                </span>
                {isSelected && <Check aria-hidden="true" className="text-brand size-4" />}
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        disabled={selected === null || connecting}
        onClick={() => selected !== null && onChoose(selected)}
      >
        {connecting ? "Conectando…" : "Conectar"}
      </Button>
    </div>
  );
}
