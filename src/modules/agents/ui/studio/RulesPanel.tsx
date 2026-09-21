"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { cn } from "@/core/lib/utils";
import { BRIEF_LIMITS, BRIEF_TONE_LABELS, BRIEF_TONES, SYSTEM_PROMPT_MAX, type AgentBriefTone } from "@/modules/agents/domain/agent";
import type { AgentStudioValues } from "@/modules/agents/ui/studio/agent-studio.schema";
import { SpecRow } from "@/modules/agents/ui/studio/SpecsPanel";
import { RuleList } from "@/shared/components/features/rule-list";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Textarea } from "@/shared/components/ui/textarea";

const LISTS = [
  { key: "always", label: "Lo que siempre hace", hint: "Comportamientos que quieres ver en cada conversación.", example: "Confirma talla y color antes de armar el pedido.", max: BRIEF_LIMITS.always },
  { key: "never", label: "Lo que nunca hace", hint: "Líneas que no cruza aunque el cliente insista.", example: "Nunca inventes precios ni tiempos de entrega.", max: BRIEF_LIMITS.never },
  { key: "handoff_when", label: "Cuándo pasa a una persona", hint: "Señales para entregar la conversación a alguien del equipo.", example: "Hay un reclamo por un pedido ya pagado.", max: BRIEF_LIMITS.handoff_when },
  { key: "business_facts", label: "Datos del negocio", hint: "Lo que tiene que saber de memoria: horarios, envíos, pagos, políticas.", example: "Envíos a toda Colombia en 2–4 días hábiles.", max: BRIEF_LIMITS.business_facts },
] as const;

/**
 * Reglas: el brief (D3) como campos, no como un texto largo. Objetivo, tono y
 * cuatro listas de frases cortas; debajo, las «Instrucciones adicionales»
 * (`system_prompt`), que siguen siendo obligatorias (D10). El modelo lee las
 * listas de arriba abajo: el orden importa y por eso se puede arrastrar.
 */
export function RulesPanel({ form }: { form: UseFormReturn<AgentStudioValues> }) {
  const { errors } = form.formState;
  const goal = form.watch("brief.goal");
  const prompt = form.watch("system_prompt");
  const tone = form.watch("brief.tone");

  return (
    <section className="flex flex-col gap-3.5" aria-labelledby="studio-rules">
      <div>
        <h2 id="studio-rules" className="text-[17px] font-semibold tracking-tight">
          Reglas
        </h2>
        <p className="text-[13px] text-muted-foreground">Frases cortas que el agente lee antes de cada respuesta. Una idea por regla; el orden importa.</p>
      </div>

      <div className="rounded-2xl border border-border bg-background">
        <SpecRow label="Objetivo" hint={`Una frase, ≤ ${String(BRIEF_LIMITS.goal)}`} htmlFor="studio-goal" error={errors.brief?.goal?.message}>
          <Textarea
            id="studio-goal"
            {...form.register("brief.goal")}
            rows={2}
            maxLength={BRIEF_LIMITS.goal}
            placeholder="Qué tiene que lograr en cada conversación. Por ejemplo: cerrar la venta con el pedido armado y el medio de pago compartido."
            className="min-h-[60px]"
          />
          <span className="w-full text-right text-[11px] tabular-nums text-muted-foreground">
            {goal.length}/{BRIEF_LIMITS.goal}
          </span>
        </SpecRow>
        <SpecRow label="Tono">
          <Controller
            control={form.control}
            name="brief.tone"
            render={({ field }) => (
              <SegmentedControl<AgentBriefTone>
                label="Tono"
                surface="inline"
                value={field.value}
                onValueChange={field.onChange}
                items={BRIEF_TONES.map((value) => ({ value, label: BRIEF_TONE_LABELS[value].label }))}
              />
            )}
          />
          <span className="text-[12.5px] text-muted-foreground">{BRIEF_TONE_LABELS[tone].hint}</span>
        </SpecRow>
      </div>

      <div className="flex flex-col gap-3.5">
        {LISTS.map((list) => (
          <Controller
            key={list.key}
            control={form.control}
            name={`brief.${list.key}`}
            render={({ field, fieldState }) => (
              <div>
                <RuleList
                  value={field.value}
                  onChange={field.onChange}
                  max={list.max}
                  maxLength={BRIEF_LIMITS.item}
                  label={list.label}
                  hint={list.hint}
                  example={list.example}
                  className={cn(fieldState.error && "border-destructive")}
                />
                {fieldState.error ? <p className="mt-1 px-1 text-xs text-destructive">{fieldState.error.message ?? "Revisa esta lista"}</p> : null}
              </div>
            )}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="studio-prompt" className="flex items-baseline justify-between text-[13px] font-medium">
          <span>
            Instrucciones adicionales <span className="text-brand">*</span>
          </span>
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            Texto libre · {prompt.length}/{SYSTEM_PROMPT_MAX.toLocaleString("es-CO")}
          </span>
        </label>
        <Textarea
          id="studio-prompt"
          {...form.register("system_prompt")}
          rows={4}
          maxLength={SYSTEM_PROMPT_MAX}
          placeholder="Todo lo que no cabe arriba: idioma, excepciones, cómo hablar de un tema delicado…"
          aria-invalid={errors.system_prompt ? true : undefined}
        />
        {errors.system_prompt ? (
          <p className="text-xs text-destructive">{errors.system_prompt.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Lo que escribas aquí va después de las reglas. Cuanto más pongas en las listas, menos hace falta aquí.</p>
        )}
      </div>
    </section>
  );
}
