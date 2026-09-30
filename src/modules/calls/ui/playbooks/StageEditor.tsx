"use client";

import { ArrowDown, ArrowUp, ChevronDown, Lock, Trash2 } from "lucide-react";
import { useId } from "react";
import { cn } from "@/core/lib/utils";
import { RuleList } from "@/shared/components/features/rule-list";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { PLAYBOOK_LIMITS, isFixedStage, type PlaybookStage } from "@/modules/calls/domain/playbooks";

/**
 * Una etapa del marco (plan de modos §5): cerrada es una línea —su número, su
 * nombre y su objetivo—; abierta se edita. Es CONTROL, no guion: qué lograr,
 * cuándo avanzar, qué hacer siempre y qué nunca. La apertura y el cierre no
 * se mueven ni se quitan (el marco empieza y termina con ellos).
 */
export function StageEditor({
  stage,
  index,
  total,
  open,
  onToggle,
  onChange,
  onMove,
  onRemove,
  readOnly,
  changed,
}: {
  stage: PlaybookStage;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  onChange: (next: PlaybookStage) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  readOnly: boolean;
  /** Cambió respecto a lo guardado: la etapa se marca para que se vea qué se va a guardar. */
  changed: boolean;
}) {
  const id = useId();
  const fixed = isFixedStage(stage);
  const canUp = !fixed && index > 1;
  const canDown = !fixed && index < total - 2;
  const set = (patch: Partial<PlaybookStage>) => onChange({ ...stage, ...patch });

  return (
    <li className={cn("border-b border-border last:border-b-0", changed && "bg-brand/[0.04]")}>
      <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums"
        >
          {index + 1}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
            {stage.label.trim() === "" ? "Etapa sin nombre" : stage.label}
            {changed && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Sin guardar
              </span>
            )}
            {fixed && <Lock aria-label="Etapa fija" className="size-3.5 text-muted-foreground" />}
          </span>
          {!open && <span className="line-clamp-2 text-sm text-muted-foreground">{stage.goal}</span>}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {!readOnly && !fixed && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={`Subir «${stage.label}»`}
                disabled={!canUp}
                onClick={() => onMove(-1)}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={`Bajar «${stage.label}»`}
                disabled={!canDown}
                onClick={() => onMove(1)}
              >
                <ArrowDown aria-hidden />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={open ? `Cerrar «${stage.label}»` : `Abrir «${stage.label}»`}
            onClick={onToggle}
          >
            <ChevronDown aria-hidden className={cn("transition-transform", open && "rotate-180")} />
          </Button>
        </div>
      </div>

      {open && (
        <div id={`${id}-body`} className="grid gap-4 px-4 pb-5 sm:pl-[3.75rem] sm:pr-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field id={`${id}-label`} label="Nombre de la etapa" count={stage.label.length} max={PLAYBOOK_LIMITS.label}>
              <Input
                id={`${id}-label`}
                value={stage.label}
                onChange={(event) => set({ label: event.target.value })}
                readOnly={readOnly}
                aria-invalid={stage.label.trim() === "" || stage.label.length > PLAYBOOK_LIMITS.label}
              />
            </Field>
            <Field
              id={`${id}-advance`}
              label="Avanza cuando"
              hint="La señal de que esta etapa ya se cumplió."
              count={stage.advance_when.length}
              max={PLAYBOOK_LIMITS.text}
            >
              <Input
                id={`${id}-advance`}
                value={stage.advance_when}
                onChange={(event) => set({ advance_when: event.target.value })}
                readOnly={readOnly}
                aria-invalid={stage.advance_when.trim() === "" || stage.advance_when.length > PLAYBOOK_LIMITS.text}
              />
            </Field>
          </div>
          <Field
            id={`${id}-goal`}
            label="Objetivo"
            hint="Qué lograr en esta etapa, no qué frase decir: el agente habla con su estilo."
            count={stage.goal.length}
            max={PLAYBOOK_LIMITS.text}
          >
            <Textarea
              id={`${id}-goal`}
              value={stage.goal}
              onChange={(event) => set({ goal: event.target.value })}
              readOnly={readOnly}
              rows={2}
              aria-invalid={stage.goal.trim() === "" || stage.goal.length > PLAYBOOK_LIMITS.text}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <RuleList
              value={stage.must}
              onChange={(must) => set({ must })}
              max={PLAYBOOK_LIMITS.list_items}
              maxLength={PLAYBOOK_LIMITS.list_item}
              label="Siempre"
              hint="Lo que el agente hace en esta etapa sin excepción."
              example="Repetir fecha y hora antes de cerrar"
              disabled={readOnly}
            />
            <RuleList
              value={stage.never}
              onChange={(never) => set({ never })}
              max={PLAYBOOK_LIMITS.list_items}
              maxLength={PLAYBOOK_LIMITS.list_item}
              label="Nunca"
              hint="Lo que el agente no hace aunque el cliente lo pida."
              example="Ofrecer descuentos que el negocio no definió"
              disabled={readOnly}
            />
          </div>
          {!readOnly && !fixed && (
            <div>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
                <Trash2 aria-hidden />
                Quitar esta etapa
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Field({
  id,
  label,
  hint,
  count,
  max,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  count: number;
  max: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[13px] font-medium">
        <span>{label}</span>
        <span className={cn("text-[11px] font-normal tabular-nums", count > max ? "text-destructive" : "text-muted-foreground")}>
          {count}/{max}
        </span>
      </label>
      {children}
      {hint !== undefined && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
