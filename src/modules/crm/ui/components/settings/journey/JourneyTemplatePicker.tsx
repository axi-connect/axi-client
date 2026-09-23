"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  attemptsLabel,
  waitOptionLabel,
  type JourneyTemplateDTO,
} from "@/modules/crm/domain/journey";
import { nicheByCode } from "@/modules/onboarding/public";

/**
 * Una línea por plantilla: sus primeras etapas y la cadencia más exigente.
 * «Cita · Asistió · Tratamiento · 4 intentos · 2 días».
 */
export function templateSummary(template: JourneyTemplateDTO): string {
  const names = template.stages.slice(0, 3).map((stage) => stage.name);
  const cadence = template.stages
    .map((stage) => stage.cadence)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.max_attempts - a.max_attempts)[0];
  const parts = [...names];
  if (template.stages.length > 3) parts.push(`+${String(template.stages.length - 3)}`);
  if (cadence !== undefined) {
    parts.push(attemptsLabel(cadence.max_attempts), waitOptionLabel(cadence.wait_hours));
  }
  return parts.join(" · ");
}

/** Nombre legible de una plantilla: el del catálogo de nichos si lo hay. */
export function templateName(template: Pick<JourneyTemplateDTO, "niche_code" | "name">): string {
  return nicheByCode(template.niche_code)?.name ?? template.name;
}

/**
 * La fila «Plantilla → {nicho}» con «Cambiar» al pasar el ratón, que abre el
 * selector EN LÍNEA (una lista de radios, el nicho del tenant primero). No es
 * un modal: elegir plantilla es parte de la misma página y se ve el resultado
 * justo debajo, en la lista de etapas.
 */
export function JourneyTemplatePicker({
  templates,
  currentCode,
  tenantNiche,
  stagesWithCadence,
  busy,
  onApply,
}: {
  templates: JourneyTemplateDTO[];
  /** `template_code` del recorrido: la última plantilla aplicada. */
  currentCode: string | null;
  /** `niche_code` de la empresa: va primero en la lista y es la sugerida. */
  tenantNiche: string | null;
  /** Cuántas etapas del pipeline tienen cadencia hoy (línea secundaria). */
  stagesWithCadence: number;
  busy: boolean;
  onApply: (nicheCode: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const ordered = useMemo(() => {
    const rest = templates.filter((template) => template.niche_code !== tenantNiche);
    const own = templates.find((template) => template.niche_code === tenantNiche);
    return own === undefined ? rest : [own, ...rest];
  }, [templates, tenantNiche]);

  const current = templates.find((template) => template.niche_code === currentCode) ?? null;
  const choice = selected ?? currentCode ?? tenantNiche ?? ordered[0]?.niche_code ?? null;

  const secondary =
    current === null
      ? "Armado a mano · elige una plantilla para partir de un recorrido probado"
      : `${String(stagesWithCadence)} ${stagesWithCadence === 1 ? "etapa" : "etapas"} con cadencia${
          current.niche_code === tenantNiche ? " · tu tipo de negocio" : ""
        }`;

  return (
    <section className="rounded-2xl border border-border bg-background">
      <ul className="grouped-list">
        <li className="grouped-row group">
          <div className="flex items-center gap-3 px-4 py-3 md:hover:bg-foreground/[0.03]">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Plantilla</p>
              <p className="text-[15px] font-medium">
                {current === null ? "Sin plantilla" : templateName(current)}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{secondary}</p>
            </div>
            {templates.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hover-reveal shrink-0 rounded-full text-xs"
                aria-expanded={open}
                aria-controls="journey-template-picker"
                onClick={() => setOpen((prev) => !prev)}
              >
                {open ? "Cerrar" : "Cambiar"}
              </Button>
            )}
          </div>
        </li>
      </ul>

      {open && (
        <div id="journey-template-picker" className="border-t border-border px-4 pt-3 pb-4">
          <div
            role="radiogroup"
            aria-label="Plantillas por tipo de negocio"
            className="grid gap-2 sm:grid-cols-2"
          >
            {ordered.map((template) => {
              const checked = template.niche_code === choice;
              return (
                <button
                  key={template.niche_code}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={busy}
                  onClick={() => setSelected(template.niche_code)}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
                    checked
                      ? "border-brand shadow-[inset_0_0_0_1px_var(--color-brand)]"
                      : "border-border hover:bg-foreground/[0.03]",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {checked && <Check className="size-3.5 text-brand" aria-hidden />}
                    {templateName(template)}
                    {template.niche_code === tenantNiche && (
                      <span className="text-xs font-normal text-muted-foreground">· tu tipo de negocio</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {templateSummary(template)}
                  </span>
                </button>
              );
            })}
          </div>
          {ordered.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay plantillas disponibles.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Aplicar una plantilla reemplaza tipos y cadencias.{" "}
            <b className="font-medium text-foreground">No borra etapas ni oportunidades.</b>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              disabled={busy || choice === null}
              onClick={() => {
                if (choice === null) return;
                void onApply(choice).then(() => {
                  setOpen(false);
                  setSelected(null);
                });
              }}
            >
              Aplicar plantilla
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setSelected(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
