"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus, Smartphone } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ProviderCard } from "@/shared/components/features/provider-card";
import type { MetaOnboardingMode } from "@/modules/channels/domain/meta-signup";
import { getMetaSignupConfig } from "@/modules/channels/infrastructure/services/meta-signup.adapter";

/**
 * Paso «Tu número» del alta de WhatsApp (F1): ¿ese número ya se usa en la app
 * WhatsApp Business del celular?
 *
 * Se pregunta ANTES del checklist porque cambia los requisitos, el popup de
 * Meta y lo que pasa después. Hasta ahora «el número no puede estar en uso»
 * era un requisito universal y el que más altas rompía; con coexistencia deja
 * de serlo.
 *
 * Si el entorno aún no tiene la coexistencia encendida (`coexistence_enabled`
 * en la configuración del popup), la tarjeta se ofrece deshabilitada con «Muy
 * pronto» en vez de esconder el paso: así la posición de los pasos no baila
 * mientras llega la configuración, y quien la ve entiende que existe.
 */
export function WhatsAppNumberModeStep({
  value,
  onChange,
  onContinue,
}: {
  value: MetaOnboardingMode | null;
  onChange: (mode: MetaOnboardingMode) => void;
  onContinue: () => void;
}) {
  const availability = useCoexistenceAvailability();
  const coexistenceDisabled = availability !== "available";

  // Preselección: coexistencia si está disponible (D7, es el camino
  // recomendado); si no, el estándar. Solo la primera vez que se sabe.
  useEffect(() => {
    if (value !== null || availability === "loading") return;
    onChange(availability === "available" ? "coexistence" : "standard");
  }, [availability, onChange, value]);

  return (
    <div className="space-y-6">
      <div
        role="radiogroup"
        aria-label="Situación del número"
        className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(20rem,1fr))]"
      >
        <ProviderCard
          brand="whatsapp"
          icon={<Smartphone aria-hidden="true" className="size-6" />}
          title={
            <span className="flex flex-wrap items-center gap-2">
              Sí, y quiero seguir usándola
              {coexistenceDisabled ? (
                <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  Muy pronto
                </span>
              ) : (
                <span className="bg-accent-violet/12 text-accent-violet rounded-full px-2 py-0.5 text-xs font-medium">
                  Recomendado
                </span>
              )}
            </span>
          }
          body="Conectas tu número de siempre. Sigue funcionando en el celular y, además, Axi lo atiende con tu agente. Conservas tus chats, contactos y grupos, y puedes traer a Axi tus contactos y los chats de los últimos 6 meses."
          footnote="Los dispositivos vinculados (WhatsApp Web, tablet) se desvinculan una vez; los vuelves a vincular"
          selected={value === "coexistence"}
          disabled={coexistenceDisabled}
          onClick={() => onChange("coexistence")}
        />
        <ProviderCard
          brand="whatsapp"
          icon={<MessageSquarePlus aria-hidden="true" className="size-6" />}
          title="No, es un número nuevo o sin WhatsApp"
          body="Un número que nunca tuvo WhatsApp, o cuya cuenta ya borraste. Queda solo en la nube de Meta, sin depender de un celular encendido."
          footnote="No sirve un número que hoy esté activo en WhatsApp o WhatsApp Business"
          selected={value === "standard"}
          onClick={() => onChange("standard")}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">¿No sabes cuál elegir?</span> Abre WhatsApp
        Business en el celular. Si ves tus chats ahí y ese es el número que quieres conectar, elige
        la primera opción.
      </p>

      <Button disabled={value === null} onClick={onContinue}>
        Continuar
      </Button>
    </div>
  );
}

type CoexistenceAvailability = "loading" | "available" | "unavailable";

/**
 * Lee `coexistence_enabled` de la configuración del popup. Un fallo de red se
 * trata como «no disponible»: el paso sigue siendo útil (el camino estándar
 * funciona) y el botón de conectar volverá a pedir la configuración por su
 * cuenta y explicará el fallo si persiste.
 */
export function useCoexistenceAvailability(): CoexistenceAvailability {
  const [state, setState] = useState<CoexistenceAvailability>("loading");
  useEffect(() => {
    let cancelled = false;
    getMetaSignupConfig("whatsapp")
      .then((config) => {
        if (cancelled) return;
        setState(config?.coexistence_enabled === true ? "available" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
