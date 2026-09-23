"use client";

import { useMemo, useRef, useState } from "react";
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
function templateSummary(template: JourneyTemplateDTO): string {
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
 * selector EN LÍNEA (un radiogroup con foco itinerante: Tab entra una vez y las
 * flechas recorren, como pide WAI-ARIA para radios). No es un modal: elegir
 * plantilla es parte de la misma página y se ve el resultado justo debajo.
 * Si aplicar falla, el selector se queda abierto con la elección puesta.
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
  /** Rechaza si no se pudo aplicar: el selector no se cierra. */
  onApply: (nicheCode: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const radiosRef = useRef<Array<HTMLButtonElement | null>>([]);

  const ordered = useMemo(() => {
    const rest = templates.filter((template) => template.niche_code !== tenantNiche);
    const own = templates.find((template) => template.niche_code === tenantNiche);
    return own === undefined ? rest : [own, ...rest];
  }, [templates, tenantNiche]);

  const current = templates.find((template) => template.niche_code === currentCode) ?? null;
  // Sin elección válida (la plantilla aplicada ya no se ofrece y el nicho del
  // tenant tampoco) no se marca nada: «Aplicar» queda deshabilitado.
  const known = (code: string | null) =>
    code !== null && ordered.some((template) => template.niche_code === code) ? code : null;
  const choice = known(selected) ?? known(currentCode) ?? known(tenantNiche);
  const choiceIndex = ordered.findIndex((template) => template.niche_code === choice);

  const secondary =
    current === null
      ? "Armado a mano · elige una plantilla para partir de un recorrido probado"
      : `${String(stagesWithCadence)} ${stagesWithCadence === 1 ? "etapa" : "etapas"} con cadencia${
          current.niche_code === tenantNiche ? " · tu tipo de negocio" : ""
        }`;

  function close(): void {
    setOpen(false);
    setSelected(null);
  }

  function moveFocus(from: number, key: string): void {
    const last = ordered.length - 1;
    let next = from;
    if (key === "ArrowDown" || key === "ArrowRight") next = from === last ? 0 : from + 1;
    else if (key === "ArrowUp" || key === "ArrowLeft") next = from === 0 ? last : from - 1;
    else if (key === "Home") next = 0;
    else if (key === "End") next = last;
    else return;
    const target = ordered[next];
    if (target === undefined) return;
    setSelected(target.niche_code);
    radiosRef.current[next]?.focus();
  }

  return (
    <section className="rounded-2xl border border-border bg-background">
      <ul className="grouped-list">
        <li className="grouped-row reveal-group">
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
                {...(open ? { "aria-controls": "journey-template-picker" } : {})}
                onClick={() => (open ? close() : setOpen(true))}
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
            {ordered.map((template, index) => {
              const checked = index === choiceIndex;
              return (
                <button
                  key={template.niche_code}
                  ref={(node) => {
                    radiosRef.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  // Sin marcado, el primero recibe el Tab (roving tabindex).
                  tabIndex={checked || (choiceIndex === -1 && index === 0) ? 0 : -1}
                  disabled={busy}
                  onClick={() => setSelected(template.niche_code)}
                  onKeyDown={(event) => {
                    if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) {
                      event.preventDefault();
                      moveFocus(index, event.key);
                    }
                  }}
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
                // Si falla, el editor ya avisó: aquí solo NO se cierra.
                onApply(choice).then(close, () => undefined);
              }}
            >
              Aplicar plantilla
            </Button>
            <Button type="button" variant="ghost" size="sm" className="rounded-full" disabled={busy} onClick={close}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
