"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { GlyphKind } from "@/shared/components/ui/glyphs/glyph-geometry";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";
import type { OnboardingStep } from "@/modules/onboarding/domain/onboarding-progress";

type PendingCopy = { title: string; lead: string; where: string; glyph: GlyphKind; tips: readonly string[] };

/**
 * Paso cuya pantalla guiada llega en F6 (WhatsApp). Mientras, el paso se cierra
 * como «omitido» y el panel ofrece el mismo resultado por el camino manual: sin
 * CTA muertos ni «pronto».
 */
const COPY: Record<"whatsapp", PendingCopy> = {
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
  step: Extract<OnboardingStep, "whatsapp">;
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
