"use client";

import { useEffect, useState } from "react";
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
import { offerLabel, trialEndsLabel, type EntitlementsDTO } from "@/modules/onboarding/domain/entitlements";
import { getMyEntitlements } from "@/modules/onboarding/infrastructure/services/onboarding-service.adapter";
import { StepAside } from "@/modules/onboarding/ui/onboarding/StepFrame";

const STATUS_LABEL = { done: "Listo", skipped: "Para después", pending: "Pendiente" } as const;

/**
 * Pantalla final. Resume lo configurado, muestra qué incluye la prueba
 * (`GET /me/entitlements`, ya en unidades comerciales: aquí no se divide nada)
 * y cierra el onboarding (`POST /onboarding/complete`). Si los entitlements no
 * cargan, el bloque no se pinta: el cierre no depende de facturación.
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
  const [entitlements, setEntitlements] = useState<EntitlementsDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyEntitlements()
      .then((data) => {
        if (!cancelled) setEntitlements(data);
      })
      .catch(() => {
        /* sin bloque «tu prueba incluye»; el cierre sigue */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

        {entitlements && entitlements.included.length > 0 ? (
          <section
            aria-label="Qué incluye tu prueba"
            className="border-brand/25 bg-brand/6 mt-5 flex flex-col gap-3 rounded-2xl border p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-[0.9375rem] font-bold">
                {entitlements.trial.active ? "Tu prueba de 7 días incluye" : `${offerLabel(entitlements)} incluye`}
              </h3>
              {trialEndsLabel(entitlements) ? <span className="text-muted-foreground text-xs">{trialEndsLabel(entitlements)}</span> : null}
            </div>
            <dl className="flex flex-col gap-2">
              {entitlements.included.map((item) => (
                <div key={`${item.metric}-${item.period}`} className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                  <dt className="text-foreground">{item.unit_label}</dt>
                  <dd className="font-mono font-semibold tabular-nums">
                    {item.quantity_display}
                    {item.approx_display ? <span className="text-muted-foreground ml-1.5 font-sans font-normal">≈ {item.approx_display}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            {entitlements.trial.active ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Al continuar con {offerLabel(entitlements)} pasas a las cuotas completas. Lo eliges en Facturación cuando quieras.
              </p>
            ) : null}
          </section>
        ) : null}

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
