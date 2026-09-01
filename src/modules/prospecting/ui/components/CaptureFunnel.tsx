"use client";

import { Lock } from "lucide-react";

import type { ProspectingStatsDTO } from "../../domain/lead";

/**
 * El embudo, con la cuarentena hecha visible.
 *
 * Los tres primeros pasos van sobre fondo violeta tenue y el cuarto lleva la
 * línea coral del CRM. Esa separación visual ES el modelo del módulo: dentro
 * de la cuarentena ninguna campaña alcanza a nadie, y quien mira la pantalla
 * tiene que entenderlo sin leer documentación.
 */
export function CaptureFunnel({ stats }: { stats: ProspectingStatsDTO }) {
  const steps = [
    {
      key: "discovered",
      label: "Descubiertos",
      value: stats.discovered,
      hint: "en total",
    },
    {
      key: "quarantined",
      label: "En cuarentena",
      value: stats.quarantined,
      hint: "esperando decisión",
    },
    {
      key: "qualified",
      label: "Calificados",
      value: stats.qualified,
      hint: "listos para promover",
    },
  ];

  return (
    <div className="border-border shadow-float bg-background mb-5 overflow-hidden rounded-lg border">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.key}
            className="bg-accent-violet/[0.04] border-border border-r p-4 last:border-r-0"
          >
            <p className="text-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
              {step.label}
            </p>
            <p className="font-heading mt-0.5 text-2xl leading-tight font-bold tabular-nums">
              {step.value}
            </p>
            <p className="text-muted-foreground text-xs">{step.hint}</p>
          </div>
        ))}
        <div className="border-border relative border-r p-4 last:border-r-0">
          <span
            className="bg-brand-gradient absolute inset-x-0 top-0 h-0.5"
            aria-hidden
          />
          <p className="text-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">
            Promovidos al CRM
          </p>
          <p className="font-heading mt-0.5 text-2xl leading-tight font-bold tabular-nums">
            {stats.promoted}
          </p>
          <p className="text-muted-foreground text-xs">ya son contactos</p>
        </div>
      </div>
      <p className="border-border bg-secondary text-muted-foreground flex items-center gap-2 border-t px-4 py-2 text-xs">
        <Lock className="size-3 shrink-0" aria-hidden />
        Mientras están en cuarentena ninguna campaña puede escribirles. Solo los
        promovidos son contactos de tu CRM.
      </p>
    </div>
  );
}
