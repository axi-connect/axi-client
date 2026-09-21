"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { cn } from "@/core/lib/utils";
import { ChannelKindIcon, type ChannelDTO } from "@/modules/channels/public";
import {
  AGENT_STATUS_LABELS,
  BRIEF_ROLE_LABELS,
  BRIEF_ROLES,
  type AgentBriefRole,
  type AgentStatus,
  type AiModelDTO,
} from "@/modules/agents/domain/agent";
import type { AgentStudioValues } from "@/modules/agents/ui/studio/agent-studio.schema";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

/** Una fila de la ficha: etiqueta → valor (regla del dueño: una ficha es una lista, no una tabla). */
export function SpecRow({ label, hint, htmlFor, children, error }: { label: ReactNode; hint?: string; /** id del control: la etiqueta pasa a ser un `<label>` real. */ htmlFor?: string; children: ReactNode; error?: string }) {
  const Tag = htmlFor ? "label" : "div";
  return (
    <div className="grid gap-1.5 border-b border-border/60 px-4 py-3 last:border-b-0 sm:grid-cols-[148px_minmax(0,1fr)] sm:gap-x-3.5 sm:items-center">
      <Tag htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
        {hint ? <span className="block text-[11.5px] font-normal text-muted-foreground">{hint}</span> : null}
      </Tag>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {children}
        {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

const PROVIDER_GROUP: Record<AiModelDTO["provider"], string> = {
  anthropic: "Anthropic",
  openai_compatible: "OpenAI compatible",
};

/**
 * Especificaciones: quién es para tus clientes y dónde trabaja. Nombre, rol,
 * estado, canales que lo usan y el modelo con su nombre amigable (elegirlo
 * fija también el proveedor; lo crudo queda en «Avanzado»).
 */
export function SpecsPanel({
  form,
  models,
  channels,
  agentId,
  onNameFocus,
}: {
  form: UseFormReturn<AgentStudioValues>;
  models: AiModelDTO[] | null;
  channels: ChannelDTO[];
  agentId: string | null;
  onNameFocus: (focused: boolean) => void;
}) {
  const { errors } = form.formState;
  const used = agentId === null ? [] : channels.filter((channel) => channel.default_ai_agent_id === agentId);
  const selectedModel = form.watch("model");
  const isOrphanModel = models !== null && selectedModel !== "" && !models.some((entry) => entry.model === selectedModel);
  const grouped = (["anthropic", "openai_compatible"] as const).map((provider) => ({
    provider,
    models: (models ?? []).filter((entry) => entry.provider === provider),
  }));

  return (
    <section className="flex flex-col gap-3.5" aria-labelledby="studio-specs">
      <div>
        <h2 id="studio-specs" className="text-[17px] font-semibold tracking-tight">
          Especificaciones
        </h2>
        <p className="text-[13px] text-muted-foreground">Quién es para tus clientes y dónde trabaja.</p>
      </div>
      <div className="rounded-2xl border border-border bg-background">
        <SpecRow
          label={
            <>
              Nombre <span className="text-brand">*</span>
            </>
          }
          hint="Así se presenta al cliente"
          htmlFor="studio-name"
          error={errors.name?.message}
        >
          <Input
            id="studio-name"
            {...form.register("name")}
            placeholder="Por ejemplo, Valentina"
            maxLength={80}
            autoComplete="off"
            onFocus={() => onNameFocus(true)}
            onBlur={(event) => {
              form.register("name").onBlur(event);
              onNameFocus(false);
            }}
            aria-invalid={errors.name ? true : undefined}
          />
        </SpecRow>
        <SpecRow label="Rol" hint="Lo que hace de verdad">
          <Controller
            control={form.control}
            name="brief.role"
            render={({ field }) => (
              <SegmentedControl<AgentBriefRole>
                label="Rol"
                surface="inline"
                value={field.value}
                onValueChange={field.onChange}
                items={BRIEF_ROLES.map((role) => ({ value: role, label: BRIEF_ROLE_LABELS[role].short }))}
              />
            )}
          />
        </SpecRow>
        <SpecRow label="Estado">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <SegmentedControl<AgentStatus>
                label="Estado"
                surface="inline"
                value={field.value}
                onValueChange={field.onChange}
                items={(["active", "paused", "draft"] as const).map((status) => ({ value: status, label: AGENT_STATUS_LABELS[status] }))}
              />
            )}
          />
        </SpecRow>
        <SpecRow label="Canales que lo usan" hint="Se asignan desde cada canal">
          {used.length > 0 ? (
            used.map((channel) => (
              <span key={channel.id} className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-border px-2.5 text-[12.5px]">
                <ChannelKindIcon kind={channel.kind} className="size-3.5" />
                {channel.name}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-muted-foreground">{agentId === null ? "Podrás asignarlo a un canal cuando exista." : "Todavía no lo usa ningún canal."}</span>
          )}
          {agentId !== null ? (
            <Link href="/settings/channels" className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 text-[12.5px] hover:border-foreground/30">
              <ExternalLink className="size-3" aria-hidden />
              {used.length > 0 ? "Otro canal" : "Asignar en Canales"}
            </Link>
          ) : null}
        </SpecRow>
        <SpecRow label="Modelo" hint="Cerebro que responde" error={errors.model?.message}>
          <Controller
            control={form.control}
            name="model"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(model) => {
                  field.onChange(model);
                  const entry = models?.find((candidate) => candidate.model === model);
                  if (entry) form.setValue("provider", entry.provider, { shouldDirty: true });
                }}
              >
                <SelectTrigger className={cn("w-full", isOrphanModel && "border-warning")} aria-label="Modelo">
                  <span className="flex items-center gap-2 truncate">
                    <Sparkles className="size-3.5 text-accent-violet" aria-hidden />
                    <SelectValue placeholder={models === null ? "Cargando modelos…" : "Elige un modelo"} />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {grouped
                    .filter((group) => group.models.length > 0)
                    .map((group) => (
                      <SelectGroup key={group.provider}>
                        <SelectLabel>{PROVIDER_GROUP[group.provider]}</SelectLabel>
                        {group.models.map((entry) => (
                          <SelectItem key={entry.model} value={entry.model}>
                            {entry.display_name}
                            {entry.is_default ? <span className="text-muted-foreground"> · recomendado</span> : null}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  {isOrphanModel ? (
                    <SelectItem value={selectedModel}>{selectedModel} (ya no disponible)</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            )}
          />
          {isOrphanModel ? <p className="w-full text-xs text-warning">Este modelo ya no está en el catálogo: elige otro antes de guardar.</p> : null}
        </SpecRow>
      </div>
    </section>
  );
}
