"use client";

import { useId, useState } from "react";
import { MessageCircle, TriangleAlert } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { Button } from "@/shared/components/ui/button";
import type { ChannelProvider } from "@/modules/channels/domain/channel-providers";

/**
 * Paso 2 del wizard: los requisitos, antes del popup.
 *
 * Este paso existe por una tesis concreta: **el abandono no ocurre en nuestra UI,
 * ocurre dentro del popup de Meta**, donde no controlamos nada y donde los
 * mensajes de error son incomprensibles para alguien no técnico. Todo esto está
 * aquí para mover el descubrimiento de los bloqueos a donde son baratos.
 *
 * No es un control de seguridad y no pretende serlo: las casillas las marca el
 * usuario, nadie las valida. Es el dispositivo de UX que evita que la persona
 * descubra dentro del popup que su número ya está en uso.
 *
 * Casillas `<input type="checkbox">` **nativas**, que es el patrón que el
 * repositorio ya usa en ocho sitios: no hace falta añadir dependencia y cumple
 * `DESIGN-SYSTEM §10` sin un `div onClick`.
 */
export function PrerequisitesChecklist({
  provider,
  onContinue,
}: {
  provider: ChannelProvider;
  onContinue: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const groupId = useId();
  const hintId = `${groupId}-hint`;

  const items = provider.prerequisites;
  const pending = items.filter((item) => checked[item.id] !== true).length;
  const allChecked = pending === 0;

  const supportUrl = salesWhatsAppUrl(
    `Hola, quiero conectar ${provider.label} en Axi y tengo dudas con los requisitos.`,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4 md:p-6">
        <ul className="divide-y divide-border/60">
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
        <Button disabled={!allChecked} aria-describedby={allChecked ? undefined : hintId} onClick={onContinue}>
          Continuar
        </Button>
        <Button variant="ghost" aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}>
          Algo de esto no lo cumplo
        </Button>
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

      {helpOpen && (
        <div className="space-y-2.5 rounded-md border border-info/40 bg-info/[0.08] p-4">
          <p className="font-semibold">No pasa nada, hay salida para cada caso</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">El número ya está en WhatsApp:</span>{" "}
            puedes borrar esa cuenta desde la app del celular y volver aquí, o usar un número
            distinto.
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              No administras la cuenta de Facebook del negocio:
            </span>{" "}
            pide que te den acceso como administrador, o que la persona que la maneja haga la
            conexión contigo.
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              Quieres probar sin comprometer tu número principal:
            </span>{" "}
            conecta primero con código QR y cámbiate al canal oficial más adelante.
          </p>
          {supportUrl !== null && (
            <Button asChild variant="outline" size="sm" className="bg-background">
              {/* axi vende por el canal que predica */}
              <a href={supportUrl} target="_blank" rel="noopener noreferrer">
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
