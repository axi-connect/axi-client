"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  OPENING_HOLE_CHOICES,
  STATIC_TYPE_HINT,
  choiceOfHole,
  holeFromChoice,
  holeIssue,
  holeValue,
  renderOpeningPreview,
  type HoleValueSources,
  type OpeningHole,
} from "@/modules/crm/domain/opening-params";
import type { ContactFieldOption } from "@/modules/crm/infrastructure/hooks/use-contact-field-catalog";

/**
 * «Qué va en cada hueco» (hotfix 2026-09-29, lienzo «Huecos»): una fila por
 * `{{n}}` con el origen y, si hace falta, su valor con el control del tipo
 * (fecha con calendario, hora, importe, número, enlace, texto) o el campo del
 * contacto elegido de un catálogo por su etiqueta. A la derecha, lo que sale
 * para el primer contacto; debajo, «Así le llega a…» con el cuerpo real.
 *
 * Lo comparten el seguimiento individual y el lote: antes cada uno adivinaba
 * los `params` por su cuenta y el lote mandaba siempre dos.
 */
export function OpeningParamsEditor({
  body,
  holes,
  onHolesChange,
  topic,
  onTopicChange,
  fields,
  sources,
  previewName,
  idPrefix = "hole",
  compact = false,
}: {
  body: string;
  holes: readonly OpeningHole[];
  onHolesChange: (next: OpeningHole[]) => void;
  topic: string;
  onTopicChange: (next: string) => void;
  fields: readonly ContactFieldOption[];
  sources: HoleValueSources;
  /** A quién se le muestra la vista previa («Ana», «el contacto»). */
  previewName: string;
  idPrefix?: string;
  /** Sin vista previa (la muestra el padre). */
  compact?: boolean;
}) {
  const update = (index: number, hole: OpeningHole) =>
    onHolesChange(holes.map((current, position) => (position === index ? hole : current)));
  const topicIndex = holes.findIndex((hole) => hole.kind === "topic");
  const preview = renderOpeningPreview(body, holes, sources);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs font-medium">
          Qué va en cada hueco
          <span className="font-normal text-muted-foreground"> · {holes.length === 1 ? "1 hueco" : `${String(holes.length)} huecos`}</span>
        </span>
        <ol className="min-w-0 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {holes.map((hole, index) => {
            const issue = holeIssue(hole, topic);
            const value = holeValue(hole, sources);
            const choice = choiceOfHole(hole);
            const rowId = `${idPrefix}-${String(index + 1)}`;
            return (
              <li key={rowId} className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1.5 px-3 py-2.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_9.5rem] sm:items-center">
                <span className="pt-2 font-mono text-[11px] text-muted-foreground sm:pt-0" aria-hidden>
                  {"{{"}
                  {String(index + 1)}
                  {"}}"}
                </span>
                <div className={cn("grid min-w-0 gap-1.5", needsValue(hole) && "sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]")}>
                  <Select value={choice} onValueChange={(next) => update(index, holeFromChoice(next, hole))}>
                    <SelectTrigger className="w-full" aria-label={`Origen del hueco ${String(index + 1)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Del contacto</SelectLabel>
                        {OPENING_HOLE_CHOICES.filter((option) => option.group === "contacto").map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Igual para todos</SelectLabel>
                        {OPENING_HOLE_CHOICES.filter((option) => option.group === "fijo").map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Otros</SelectLabel>
                        {OPENING_HOLE_CHOICES.filter((option) => option.group === "otros").map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {hole.kind === "custom_field" && (
                    <Select value={hole.code || undefined} onValueChange={(code) => update(index, { kind: "custom_field", code })}>
                      <SelectTrigger className="w-full" aria-label={`Campo del hueco ${String(index + 1)}`} aria-invalid={issue !== null || undefined}>
                        <SelectValue placeholder="Elige el campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((field) => (
                          <SelectItem key={field.code} value={field.code}>{field.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {hole.kind === "static" && (
                    <Input
                      type={hole.type === "date" ? "date" : hole.type === "time" ? "time" : hole.type === "url" ? "url" : hole.type === "number" || hole.type === "money" ? "text" : "text"}
                      inputMode={hole.type === "money" || hole.type === "number" ? "decimal" : undefined}
                      value={hole.raw}
                      aria-label={`Valor del hueco ${String(index + 1)}`}
                      aria-invalid={issue !== null && hole.raw.trim() !== "" ? true : undefined}
                      placeholder={hole.type === "money" ? "120000" : hole.type === "url" ? "https://…" : hole.type === "text" ? "lo mismo para todos" : undefined}
                      title={STATIC_TYPE_HINT[hole.type]}
                      onChange={(event) => update(index, { ...hole, raw: event.target.value })}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "col-start-2 min-w-0 truncate text-xs sm:col-start-3",
                    issue === null ? "text-muted-foreground" : "text-muted-foreground italic",
                  )}
                  title={value ?? issue ?? undefined}
                >
                  → {value !== null ? <b className="font-medium text-foreground">{value}</b> : (issue ?? "…")}
                </span>
              </li>
            );
          })}
        </ol>
        {topicIndex >= 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-topic`} className="text-xs font-medium text-muted-foreground">
              Tema (rellena {"{{"}{String(topicIndex + 1)}{"}}"})
            </label>
            <Input
              id={`${idPrefix}-topic`}
              value={topic}
              placeholder="la cotización del plan anual"
              aria-invalid={topic.trim().length < 2 || undefined}
              onChange={(event) => onTopicChange(event.target.value)}
            />
          </div>
        )}
        <p className="text-[11.5px] leading-snug text-pretty text-muted-foreground">
          Del contacto: nombre, nombre completo o un campo de su ficha (cambia con cada uno; a quien le falte,
          su seguimiento queda en espera y lo dice). Igual para todos: texto, fecha, hora, importe, número o
          enlace, escritos como se leen.
        </p>
      </div>

      {!compact && (
        <div className="rounded-2xl border border-border bg-muted/60 p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MessageCircle aria-hidden className="size-3.5" />
            Así le llega a {previewName} · vista previa
          </p>
          <div className="max-w-md rounded-[14px_14px_14px_4px] border border-border bg-background px-3 py-2.5 text-sm leading-relaxed shadow-float">
            {preview.map((segment, index) =>
              segment.variable ? (
                <mark
                  key={String(index)}
                  className={cn("rounded px-0.5 text-foreground", segment.text === "…" ? "bg-warning/25" : "bg-accent")}
                >
                  {segment.text}
                </mark>
              ) : (
                <span key={String(index)}>{segment.text}</span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function needsValue(hole: OpeningHole): boolean {
  return hole.kind === "static" || hole.kind === "custom_field";
}
