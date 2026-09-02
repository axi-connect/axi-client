"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import { FieldList, type FieldItem } from "@/shared/components/features/field-list";
import { nicheByCode } from "@/modules/onboarding/domain/niches";
import {
  ONBOARDING_STEPS,
  stepStatus,
  type OnboardingProgressDTO,
} from "@/modules/onboarding/domain/onboarding-progress";
import { StepAside } from "@/modules/onboarding/ui/onboarding/StepFrame";

const STATUS_LABEL = { done: "Listo", skipped: "Para después", pending: "Pendiente" } as const;

/**
 * Pantalla final. Resume lo configurado y cierra el onboarding
 * (`POST /onboarding/complete`). F6 añade aquí «Tu prueba incluye…» con los
 * entitlements; el resumen y el CTA no cambian.
 */
export function DoneStep({
  progress,
  companyName,
  saving,
  error,
  onFinish,
}: {
  progress: OnboardingProgressDTO;
  companyName: string | null;
  saving: boolean;
  error: string | null;
  onFinish: () => void;
}) {
  const items: FieldItem[] = [
    { label: "Tipo de negocio", value: nicheByCode(progress.niche_code)?.name ?? "Sin definir" },
    ...ONBOARDING_STEPS.filter((step) => step.code !== "niche").map((step) => {
      const status = stepStatus(progress, step.code);
      return {
        label: step.label,
        value: (
          <Badge variant={status === "done" ? "default" : "secondary"} className={status === "done" ? "" : "text-muted-foreground"}>
            {STATUS_LABEL[status]}
          </Badge>
        ),
      };
    }),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
      <section aria-label="Configuración completada" className="min-w-0">
        <div className="flex flex-col items-center gap-3 pb-6 text-center">
          <GlassGlyph kind="uptodate" tier="lg" className="glass-glyph--success" />
          <h2 className="font-heading text-[1.75rem] leading-tight font-bold tracking-tight">
            {companyName ?? "Tu empresa"} está lista
          </h2>
          <p className="text-muted-foreground max-w-[36rem] text-sm leading-relaxed">
            Esto es lo que dejaste configurado. Lo que quedó para después lo encuentras en el panel, y te lo recordamos hasta que lo termines.
          </p>
        </div>

        <div className="border-border bg-background/70 rounded-2xl border p-5">
          <FieldList items={items} layout="rows" />
        </div>

        <div className="border-border/70 mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <span className="text-muted-foreground text-xs">Puedes volver a cualquier paso desde Ajustes.</span>
          <div className="flex flex-col items-end gap-1.5">
            <Button size="lg" className="h-11" disabled={saving} onClick={onFinish}>
              {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              Ir a mi panel
              {!saving ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
            {error ? (
              <span role="alert" className="text-destructive text-xs">
                {error}
              </span>
            ) : null}
          </div>
        </div>
      </section>
      <StepAside
        glyph="ai"
        title="Qué sigue"
        text="Escríbele a tu propio número y prueba una venta completa. Verás cada conversación en el inbox y podrás intervenir cuando quieras."
        tips={["Invita a tu equipo desde Usuarios", "Conecta Instagram y Messenger en Canales", "Cuando quieras seguir, elige tu plan en Facturación"]}
      />
    </div>
  );
}
