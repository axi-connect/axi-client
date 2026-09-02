"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { GlyphKind } from "@/shared/components/ui/glyphs/glyph-geometry";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";
import type { OnboardingStep } from "@/modules/onboarding/domain/onboarding-progress";

type PendingCopy = { title: string; lead: string; where: string; glyph: GlyphKind; tips: readonly string[] };

/**
 * Pasos cuya pantalla guiada llega en fases posteriores (catálogo F4, agentes
 * F5, WhatsApp F6). Mientras, el paso se cierra como «omitido» y el panel
 * ofrece el mismo resultado por el camino manual: sin CTA muertos ni «pronto».
 */
const COPY: Record<"catalog" | "agents" | "whatsapp", PendingCopy> = {
  catalog: {
    title: "Tu catálogo",
    lead: "Carga tus productos o servicios para que el agente los conozca. Puedes hacerlo ahora desde el panel o dejarlo para después.",
    where: "Ventas → Catálogo",
    glyph: "catalog",
    tips: ["Productos y servicios con precio y descripción", "Categorías para que el agente encuentre rápido", "Fotos que el agente envía en el chat"],
  },
  agents: {
    title: "Tu agente de IA",
    lead: "Crea el agente que atenderá a tus clientes. Lo configuras desde el panel con tu catálogo y tu horario ya cargados.",
    where: "Ajustes → Agentes IA",
    glyph: "ai",
    tips: ["Instrucciones, tono y personalidad", "Traspaso a una persona cuando hace falta", "Notas de voz si tu cliente escribe por voz"],
  },
  whatsapp: {
    title: "Conecta tu WhatsApp",
    lead: "Es lo que pone a trabajar a tu agente. Se conecta desde Canales con la API oficial de Meta o con tu número actual.",
    where: "Ajustes → Canales",
    glyph: "connections",
    tips: ["WhatsApp oficial por Meta en un solo paso", "O tu número actual, sin verificación de Meta", "Instagram y Messenger también en Canales"],
  },
};

export function PendingStep({
  step,
  stepNumber,
  saving,
  onBack,
  onSkip,
}: {
  step: Extract<OnboardingStep, "catalog" | "agents" | "whatsapp">;
  stepNumber: number;
  saving: boolean;
  onBack: () => void;
  onSkip: () => void;
}) {
  const copy = COPY[step];
  return (
    <StepFrame
      stepNumber={stepNumber}
      total={5}
      label={copy.title}
      title={copy.title}
      lead={copy.lead}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Atrás
          </Button>
          <Button size="lg" className="h-11" disabled={saving} onClick={onSkip}>
            Configurar después desde el panel
            <ArrowRight aria-hidden="true" />
          </Button>
        </>
      }
      aside={<StepAside glyph={copy.glyph} title="Qué vas a configurar" text={`Lo encuentras en ${copy.where}.`} tips={copy.tips} />}
    >
      <p className="border-border bg-background/70 rounded-2xl border p-5 text-sm leading-relaxed">
        Este paso lo completas desde <strong>{copy.where}</strong> cuando quieras. El progreso queda guardado y el panel te recuerda lo que falta.
      </p>
    </StepFrame>
  );
}
