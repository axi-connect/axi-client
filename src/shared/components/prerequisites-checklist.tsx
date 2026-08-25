"use client";

import { useId, useState } from "react";
import { MessageCircle, TriangleAlert } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { Button } from "@/shared/components/ui/button";

/**
 * Checklist de requisitos previa a una conexión (canales E integRACIONES: el
 * mismo dispositivo de UX, extraído en F8 para no mantenerlo dos veces).
 *
 * Existe por una tesis concreta: **el abandono no ocurre en nuestra UI, ocurre
 * dentro del admin/popup del proveedor**, donde no controlamos nada y los
 * errores son incomprensibles. Las casillas mueven el descubrimiento de los
 * bloqueos a donde son baratos.
 *
 * No es un control de seguridad y no pretende serlo: las casillas las marca el
 * usuario, nadie las valida. Son `<input type="checkbox">` NATIVAS (patrón del
 * repo, DESIGN-SYSTEM §10): un `div onClick` no es un checkbox para un lector
 * de pantalla ni responde a la barra espaciadora.
 *
 * Los props son ESTRUCTURALES a propósito: recibe items y textos, no el
 * descriptor de un módulo concreto — cada módulo adapta el suyo.
 */
export type PrerequisiteChecklistItem = {
  id: string;
  label: string;
  /** El detalle que evita descubrir el bloqueo dentro del proveedor. */
  detail: string;
  /** `true` pinta el aviso destacado: son los que más altas rompen. */
  critical?: boolean;
};

export function PrerequisitesChecklist({
  providerLabel,
  items,
  onContinue,
  supportMessage,
  helpContent,
}: {
  providerLabel: string;
  items: readonly PrerequisiteChecklistItem[];
  onContinue: () => void;
  /** Mensaje prellenado del botón de soporte por WhatsApp del panel de ayuda. */
  supportMessage?: string;
  /** Alternativas del módulo para quien no cumple algún punto. Con esto (o con
   * `supportMessage`) aparece la salida lateral «Algo de esto no lo cumplo». */
  helpContent?: React.ReactNode;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const groupId = useId();
  const hintId = `${groupId}-hint`;

  const pending = items.filter((item) => checked[item.id] !== true).length;
  const allChecked = pending === 0;
  const hasHelp = helpContent !== undefined || supportMessage !== undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 md:p-6">
        <ul
          aria-label={`Requisitos para conectar ${providerLabel}`}
          className="divide-y divide-border/60"
        >
          {items.map((item) => {
            const inputId = `${groupId}-${item.id}`;
            return (
              <li key={item.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked[item.id] === true}
                  onChange={(event) =>
                    setChecked((prev) => ({ ...prev, [item.id]: event.target.checked }))
                  }
                  className="mt-0.5 size-4.5 shrink-0 accent-primary"
                />
                <div className="min-w-0 space-y-1">
                  <label htmlFor={inputId} className="cursor-pointer font-medium">
                    {item.label}
                  </label>
                  {item.critical === true ? (
                    // El ítem que más altas rompe no va como texto secundario:
                    // va como aviso, porque su consecuencia es irreversible
                    <div className="flex gap-2.5 rounded-md border border-warning/40 bg-warning/[0.09] p-3">
                      <TriangleAlert
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-warning"
                      />
                      <p className="text-sm">{item.detail}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!allChecked}
          aria-describedby={allChecked ? undefined : hintId}
          onClick={onContinue}
        >
          Continuar
        </Button>
        {hasHelp && (
          <Button variant="ghost" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}>
            Algo de esto no lo cumplo
          </Button>
        )}
        {/* Un botón deshabilitado sin explicación es un callejón sin salida: el
            motivo viaja por `aria-describedby`, no solo por el color gris */}
        {!allChecked && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {pending === 1
              ? "Falta confirmar un punto para continuar."
              : `Faltan ${pending} puntos por confirmar.`}
          </p>
        )}
      </div>

      {helpOpen && hasHelp && (
        <div className="space-y-2.5 rounded-md border border-info/40 bg-info/[0.08] p-4">
          {helpContent}
          {supportMessage !== undefined && (
            <Button asChild variant="outline" size="sm" className="bg-background">
              {/* axi vende por el canal que predica */}
              <a href={salesWhatsAppUrl(supportMessage)} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" className="size-4" />
                Hablar con soporte por WhatsApp
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
