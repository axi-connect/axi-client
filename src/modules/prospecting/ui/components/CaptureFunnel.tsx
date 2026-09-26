"use client";

import { useEffect } from "react";
import { Lock } from "lucide-react";

import { useCaptureStats } from "../../infrastructure/stores/capture-stats.store";

const n = (value: number) => value.toLocaleString("es-CO");

/**
 * El embudo, con la cuarentena hecha visible.
 *
 * Los tres primeros pasos van sobre fondo violeta tenue y el cuarto lleva la
 * línea coral del CRM. Esa separación visual ES el modelo del módulo: dentro
 * de la cuarentena ninguna campaña alcanza a nadie, y quien mira la pantalla
 * tiene que entenderlo sin leer documentación.
 *
 * Una tarjeta `@container`: ancha, cuarentena y CRM lado a lado; estrecha, en
 * dos filas, sin que ninguna cifra se salga.
 */
export function CaptureFunnel() {
  const stats = useCaptureStats((state) => state.stats);
  const reload = useCaptureStats((state) => state.reload);

  // Si el servidor no pudo precargarlas, se piden aquí: el embudo no se queda en blanco.
  useEffect(() => {
    if (stats === null) void reload();
  }, [stats, reload]);

  const steps = [
    { key: "discovered", label: "Descubiertos", value: stats?.discovered, hint: "en total" },
    { key: "quarantined", label: "En cuarentena", value: stats?.quarantined, hint: "esperando decisión" },
    { key: "qualified", label: "Calificados", value: stats?.qualified, hint: "listos para promover" },
  ];

  return (
    <section aria-label="El camino del lead" className="border-border bg-card @container min-w-0 overflow-hidden rounded-3xl border">
      <div className="grid @3xl:grid-cols-[3fr_1fr]">
        <div className="bg-accent-violet/[0.05] grid grid-cols-2 gap-y-5 px-5 py-5 @xl:grid-cols-3 @xl:px-6">
          {steps.map((step, index) => (
            <Figure
              key={step.key}
              label={step.label}
              value={step.value}
              hint={step.hint}
              className={index > 0 ? "@xl:border-border @xl:border-l @xl:pl-5" : undefined}
            />
          ))}
        </div>
        <div className="border-border relative border-t px-5 py-5 @3xl:border-t-0 @3xl:border-l @xl:px-6">
          <span aria-hidden className="bg-brand-gradient absolute inset-x-0 top-0 h-[3px]" />
          <Figure label="Promovidos al CRM" value={stats?.promoted} hint="ya son contactos" />
        </div>
      </div>
      <p className="border-border text-muted-foreground flex items-start gap-2 border-t px-5 py-3 text-xs text-pretty @xl:px-6">
        <Lock className="mt-px size-3.5 shrink-0" aria-hidden />
        Mientras están en cuarentena ninguna campaña puede escribirles. Solo los promovidos son contactos de tu CRM.
      </p>
    </section>
  );
}

function Figure({ label, value, hint, className }: { label: string; value: number | undefined; hint: string; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 pr-4 ${className ?? ""}`}>
      <span className="text-muted-foreground text-xs">{label}</span>
      {value === undefined ? (
        <span aria-hidden className="bg-muted h-8 w-20 animate-pulse rounded-lg" />
      ) : (
        <span className="font-heading text-[2rem] leading-none font-bold tracking-tight tabular-nums">{n(value)}</span>
      )}
      <span className="text-muted-foreground text-xs">{hint}</span>
    </div>
  );
}
