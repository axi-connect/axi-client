"use client";

import { Settings2 } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { AI_PROVIDER_LABELS, ASSIGNABLE_AI_PROVIDERS, type AiModelDTO, type AssignableAiProvider } from "@/modules/agents/domain/agent";
import type { IntentionDTO } from "@/modules/agents/domain/intentions";
import { AgentIntentionsEditor } from "@/modules/agents/ui/components/AgentIntentionsEditor";
import type { AgentStudioValues } from "@/modules/agents/ui/studio/agent-studio.schema";
import { defaultModelFor } from "@/modules/agents/ui/studio/agent-studio.mappers";
import { SpecRow } from "@/modules/agents/ui/studio/SpecsPanel";
import { OptionsInput } from "@/shared/components/features/options-input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-[13px] font-medium">
        <span>{label}</span>
        {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * Lo técnico, plegado (D7): proveedor y modelo crudo, temperatura, tokens,
 * especialidades, palabras que escalan, fallos antes de escalar, intenciones y
 * la política de voz. Cerrado por defecto: el estudio se lee sin esto.
 */
export function AdvancedSection({
  form,
  models,
  intentions,
  hasVoice,
  defaultOpen = false,
}: {
  form: UseFormReturn<AgentStudioValues>;
  models: AiModelDTO[] | null;
  intentions: IntentionDTO[];
  hasVoice: boolean;
  defaultOpen?: boolean;
}) {
  const { errors } = form.formState;
  const provider = form.watch("provider");
  const providerModels = (models ?? []).filter((entry) => entry.provider === provider);
  const selectedModel = form.watch("model");
  const maxTemperature = providerModels.find((entry) => entry.model === selectedModel)?.temperature_max ?? (provider === "anthropic" ? 1 : 2);
  const voiceEnabled = form.watch("voice_policy.enabled");

  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? "advanced" : undefined} className="rounded-2xl border border-border bg-background">
      <AccordionItem value="advanced" className="border-b-0">
        <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
          <span className="flex items-center gap-2.5 text-left">
            <Settings2 className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-[14.5px] font-semibold">Avanzado</span>
            <span className="text-[12.5px] font-normal text-muted-foreground">Modelo, límites, intenciones y política de voz</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="border-t border-border/60 px-4 pt-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="studio-provider" label="Proveedor">
              <Controller
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) => {
                      field.onChange(next as AssignableAiProvider);
                      // Cambiar de proveedor cambia el juego de modelos: se preselecciona su default
                      form.setValue("model", defaultModelFor(models, next as AssignableAiProvider), { shouldDirty: true });
                    }}
                  >
                    <SelectTrigger id="studio-provider" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_AI_PROVIDERS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {AI_PROVIDER_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="studio-model-raw" label="Modelo" hint="identificador">
              <Input id="studio-model-raw" value={selectedModel} readOnly className="font-mono text-xs" aria-describedby="studio-model-raw-hint" />
              <span id="studio-model-raw-hint" className="sr-only">
                Se elige por su nombre en Especificaciones
              </span>
            </Field>
            <Field id="studio-temperature" label="Temperatura" hint={`máx. ${String(maxTemperature)} en ${AI_PROVIDER_LABELS[provider]}`} error={errors.temperature?.message}>
              <Input id="studio-temperature" {...form.register("temperature")} inputMode="decimal" placeholder={`0 – ${String(maxTemperature)}`} className="tabular-nums" />
            </Field>
            <Field id="studio-max-tokens" label="Máx. tokens por respuesta" error={errors.max_tokens?.message}>
              <Input id="studio-max-tokens" {...form.register("max_tokens")} inputMode="numeric" placeholder="700" className="tabular-nums" />
            </Field>
            <Field id="studio-skills" label="Especialidades" hint="≤ 30">
              <Controller control={form.control} name="skills" render={({ field }) => <OptionsInput inputId="studio-skills" value={field.value} onChange={field.onChange} max={30} maxLength={80} ariaLabel="Nueva especialidad" />} />
            </Field>
            <Field id="studio-keywords" label="Palabras que escalan" hint="además de las reglas">
              <Controller control={form.control} name="handoff_keywords" render={({ field }) => <OptionsInput inputId="studio-keywords" value={field.value} onChange={field.onChange} max={50} maxLength={80} ariaLabel="Nueva palabra que escala" />} />
            </Field>
            <Field id="studio-max-failures" label="Fallos antes de escalar" hint="1 – 10" error={errors.max_failures?.message}>
              <Input id="studio-max-failures" {...form.register("max_failures")} inputMode="numeric" placeholder="3" className="tabular-nums" />
            </Field>
          </div>

          <div className="mt-5 flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Intenciones que atiende</span>
            <Controller
              control={form.control}
              name="intentions"
              render={({ field }) => <AgentIntentionsEditor intentions={intentions} selected={new Set(field.value)} onChange={(next) => field.onChange([...next])} />}
            />
          </div>

          <div className="mt-5 flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between text-[13px] font-medium">
              <span>Política de voz</span>
              <span className="text-xs font-normal text-muted-foreground">{hasVoice ? "con la voz elegida arriba" : "elige una voz primero"}</span>
            </span>
            <div className="rounded-2xl border border-border">
              <SpecRow label="Responder con notas de voz" hint="Cuando el cliente le habla por audio">
                <Controller
                  control={form.control}
                  name="voice_policy.enabled"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!hasVoice} aria-label="Responder con notas de voz" />}
                />
                {!hasVoice && voiceEnabled ? <p className="w-full text-xs text-warning">Sin voz elegida el agente seguirá respondiendo por texto.</p> : null}
              </SpecRow>
              <SpecRow label="Máximo por conversación" error={errors.voice_policy?.max_per_conversation?.message}>
                <Input {...form.register("voice_policy.max_per_conversation")} inputMode="numeric" placeholder="6" className="w-24 tabular-nums" aria-label="Máximo de notas de voz por conversación" />
                <span className="text-[12.5px] text-muted-foreground">notas de voz</span>
              </SpecRow>
              <SpecRow label="Largo máximo" error={errors.voice_policy?.max_chars?.message}>
                <Input {...form.register("voice_policy.max_chars")} inputMode="numeric" placeholder="600" className="w-24 tabular-nums" aria-label="Largo máximo de una nota de voz" />
                <span className="text-[12.5px] text-muted-foreground">caracteres ≈ 37 s</span>
              </SpecRow>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
