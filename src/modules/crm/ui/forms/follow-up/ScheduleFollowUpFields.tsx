"use client";

import { useFormState, useWatch, type Control } from "react-hook-form";
import {
  CircleCheck,
  Clock,
  Info,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneCall,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  businessDateTimeToIso,
  dateShortcuts,
  FOLLOW_UP_MEDIA,
  OBJECTIVE_EXAMPLES,
  OPENING_PARAM_LABELS,
  promiseSentence,
  quietHoursShift,
  renderTemplatePreview,
  defaultOpeningParams,
  windowNotice,
  type ContactReachabilityDTO,
  type FollowUpMedium,
  type WindowNotice,
} from "@/modules/crm/domain/schedule-follow-up";
import type { AgentTaskSettings } from "@/modules/crm/domain/agent-task-settings";
import { countTemplateVariables, formatTemplateCost, type HsmTemplateDTO } from "@/modules/marketing/public";
import { NO_TEMPLATE, OBJECTIVE_MAX, type ScheduleFollowUpValues } from "../config/schedule-follow-up.config";

/**
 * Bloques del formulario «Programar seguimiento» (F2). Cada uno reacciona a los
 * valores del formulario con `useWatch` sobre el `control` que le pasa
 * `DynamicForm` (patrón `TimeAvailabilityField`), así el aviso de horario
 * silencioso, el estado de la ventana y la promesa del footer cambian AL
 * TECLEAR, no al guardar.
 */

const MEDIUM_ICONS: Record<FollowUpMedium, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  call: PhoneCall,
  call_then_message: Phone,
};

/** Tres tarjetas-radio: la tercera necesita dos líneas para explicarse, y en un
 *  `SegmentedControl` no caben. Las que el plan no incluye se ven
 *  deshabilitadas con su razón — prometer menos y decirlo, no esconderlo. */
export function MediumPicker({
  value,
  available: availableMedia,
  onChange,
}: {
  value: FollowUpMedium;
  /** Medios que el plan del tenant permite (F3: llamar exige `calls`). */
  available: readonly FollowUpMedium[];
  onChange: (medium: FollowUpMedium) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Cómo contacta" className="grid gap-2 sm:grid-cols-3">
      {FOLLOW_UP_MEDIA.map((option) => {
        const Icon = MEDIUM_ICONS[option.value];
        const available = availableMedia.includes(option.value);
        const checked = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={!available}
            disabled={!available}
            onClick={() => available && onChange(option.value)}
            className={cn(
              "grid grid-cols-[auto_1fr] items-start gap-x-2.5 gap-y-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
              checked ? "border-brand bg-accent" : "border-border bg-background hover:bg-secondary/60",
              !available && "cursor-not-allowed opacity-55",
            )}
          >
            <Icon
              aria-hidden
              className={cn("row-span-2 mt-0.5 size-4", checked ? "text-accent-violet" : "text-muted-foreground")}
            />
            <span className="text-sm font-medium">{option.label}</span>
            <span className="text-xs leading-snug text-muted-foreground">
              {available ? option.description : "Tu plan no incluye llamadas del agente."}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ObjectiveField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <textarea
        id="fu-objective"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        rows={3}
        placeholder="Retomar la cotización del plan anual: preguntarle si la revisó y resolverle dudas de precio."
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed"
      />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {OBJECTIVE_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onChange(example)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value.length} / {OBJECTIVE_MAX}
        </span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Atajos + fecha + hora, en la zona del negocio, con el aviso del silencio. */
export function WhenPicker({
  control,
  values,
  onChange,
  tz,
  now,
  settings,
}: {
  control: Control<ScheduleFollowUpValues>;
  values: { date: string; time: string };
  onChange: (next: { date: string; time: string }) => void;
  tz: string;
  now: Date;
  settings: AgentTaskSettings | null;
}) {
  const [date, time] = useWatch({ control, name: ["date", "time"] });
  const { errors: formErrors } = useFormState({ control, name: ["date", "time"] });
  const errors = { date: formErrors.date?.message, time: formErrors.time?.message };
  const shortcuts = dateShortcuts(now, tz);
  const shift =
    settings === null
      ? { quiet: false as const }
      : quietHoursShift(date || values.date, time || values.time, settings.quiet_start_hour, settings.quiet_end_hour);
  return (
    <div className="space-y-2.5">
      <div role="group" aria-label="Atajos de fecha" className="flex flex-wrap gap-1.5">
        {shortcuts.map((shortcut) => {
          const active = date === shortcut.date && time === shortcut.time;
          return (
            <button
              key={shortcut.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ date: shortcut.date, time: shortcut.time })}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {shortcut.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Input
            id="fu-date"
            type="date"
            aria-label="Fecha"
            value={date}
            aria-invalid={Boolean(errors.date)}
            onChange={(event) => onChange({ date: event.target.value, time })}
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
        </div>
        <div className="space-y-1">
          <Input
            id="fu-time"
            type="time"
            aria-label="Hora"
            value={time}
            aria-invalid={Boolean(errors.time)}
            onChange={(event) => onChange({ date, time: event.target.value })}
          />
          {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
        </div>
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-info" />
        <span>
          Hora de <strong className="font-medium text-foreground">{tz.replace(/_/g, " ")}</strong>, la zona
          de tu negocio.
          {shift.quiet && (
            <>
              {" "}
              A esa hora el agente no escribe (silencio {shift.window}): saldrá a las{" "}
              <strong className="font-medium text-foreground">{shift.resumes_at.time.replace(/^0/, "")}</strong>
              {shift.resumes_at.date !== date ? " del día siguiente" : ""}.
            </>
          )}
        </span>
      </p>
    </div>
  );
}

const NOTICE_STYLES: Record<WindowNotice["tone"], { box: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }> = {
  ok: { box: "border-border bg-background", icon: CircleCheck, iconClass: "text-success" },
  info: { box: "border-border bg-background", icon: Info, iconClass: "text-info" },
  warn: { box: "border-warning/35 bg-warning/[0.06]", icon: TriangleAlert, iconClass: "text-warning" },
  muted: { box: "border-dashed border-border bg-background", icon: Info, iconClass: "text-muted-foreground" },
};

/** «Estado del contacto en WhatsApp»: lo que hará el motor, dicho antes de programar. */
export function WindowNoticeCard({
  control,
  reach,
  firstName,
  tz,
  hasApprovedTemplates,
  now,
  templatesHref,
}: {
  control: Control<ScheduleFollowUpValues>;
  reach: ContactReachabilityDTO | null;
  firstName: string;
  tz: string;
  hasApprovedTemplates: boolean;
  now: Date;
  templatesHref: string;
}) {
  const [date, time] = useWatch({ control, name: ["date", "time"] });
  const scheduled =
    /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)
      ? businessDateTimeToIso(date, time, tz)
      : null;
  const notice = windowNotice(reach, firstName, tz, hasApprovedTemplates, scheduled, now);
  const style = NOTICE_STYLES[notice.tone];
  const Icon = style.icon;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs leading-relaxed", style.box)} role="status">
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", style.iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{notice.title}</p>
        {notice.body && <p className="text-muted-foreground">{notice.body}</p>}
        {notice.waits_for_customer && reach?.supports_templates === true && !hasApprovedTemplates && (
          <Link href={templatesHref} className="mt-1 inline-flex items-center gap-1 font-medium text-brand hover:underline">
            Crear una plantilla de apertura
          </Link>
        )}
      </div>
    </div>
  );
}

/** Selector de plantilla + tema + vista previa con los datos reales del contacto. */
export function OpeningTemplatePicker({
  control,
  templates,
  values,
  onChange,
  contact,
  companyName,
}: {
  control: Control<ScheduleFollowUpValues>;
  templates: readonly HsmTemplateDTO[];
  values: { opening_template_id: string; topic: string };
  onChange: (next: Partial<{ opening_template_id: string; topic: string }>) => void;
  contact: { first_name: string | null; full_name: string | null };
  companyName: string;
}) {
  const [templateId, topic] = useWatch({ control, name: ["opening_template_id", "topic"] });
  const { errors: formErrors } = useFormState({ control, name: ["opening_template_id", "topic"] });
  const errors = {
    opening_template_id: formErrors.opening_template_id?.message,
    topic: formErrors.topic?.message,
  };
  const selected = templates.find((template) => template.id === (templateId || values.opening_template_id));
  const params = selected === undefined ? [] : defaultOpeningParams(countTemplateVariables(selected.body));
  const usesTopic = params.includes("topic");
  const preview =
    selected === undefined
      ? []
      : renderTemplatePreview(selected.body, params, {
          first_name: contact.first_name,
          full_name: contact.full_name,
          company_name: companyName,
          topic: (topic || values.topic).trim(),
        });
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Select
          value={templateId === NO_TEMPLATE ? undefined : templateId}
          onValueChange={(next) => onChange({ opening_template_id: next })}
        >
          <SelectTrigger id="fu-template" aria-label="Plantilla de apertura" aria-invalid={Boolean(errors.opening_template_id)}>
            <SelectValue placeholder="Elige la plantilla con la que abre" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <span className="font-mono text-xs">{template.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {template.category} · {formatTemplateCost(template.category)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.opening_template_id && <p className="text-xs text-destructive">{errors.opening_template_id}</p>}
      </div>

      {selected !== undefined && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {usesTopic && (
              <div className="space-y-1">
                <label htmlFor="fu-topic" className="text-xs font-medium">
                  Tema (rellena {"{{"}
                  {String(params.indexOf("topic") + 1)}
                  {"}}"})
                </label>
                <Input
                  id="fu-topic"
                  value={topic}
                  aria-invalid={Boolean(errors.topic)}
                  placeholder="la cotización del plan anual"
                  onChange={(event) => onChange({ topic: event.target.value })}
                />
                {errors.topic && <p className="text-xs text-destructive">{errors.topic}</p>}
              </div>
            )}
            <div className="space-y-1">
              <span className="text-xs font-medium">Variables</span>
              <div className="flex flex-wrap gap-1.5">
                {params.map((param, index) => (
                  <span key={`${param}-${String(index)}`} className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {"{{"}
                    {String(index + 1)}
                    {"}}"} → {OPENING_PARAM_LABELS[param]}
                  </span>
                ))}
                {params.length === 0 && <span className="text-xs text-muted-foreground">Sin variables</span>}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/60 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MessageCircle aria-hidden className="size-3.5" />
              Así lo verá {contact.first_name?.trim() || contact.full_name?.trim().split(/\s+/)[0] || "el contacto"} · vista previa
            </p>
            <div className="max-w-md rounded-[14px_14px_14px_4px] border border-border bg-background px-3 py-2.5 text-sm leading-relaxed shadow-float">
              {preview.map((segment, index) =>
                segment.variable ? (
                  <mark key={String(index)} className="rounded bg-accent px-0.5 text-foreground">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={String(index)}>{segment.text}</span>
                ),
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              La plantilla abre; cuando responda, el agente continúa con tu objetivo en el mismo chat.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** El footer repite la promesa con datos reales: agente, contacto, día y hora. */
export function PromiseLine({
  control,
  agents,
  contactFirstName,
  tz,
  reach,
  hasApprovedTemplates,
  settings,
  now,
}: {
  control: Control<ScheduleFollowUpValues>;
  agents: ReadonlyArray<{ id: string; name: string }>;
  contactFirstName: string;
  tz: string;
  reach: ContactReachabilityDTO | null;
  hasApprovedTemplates: boolean;
  settings: AgentTaskSettings | null;
  now: Date;
}) {
  const [date, time, medium, templateId, agentId] = useWatch({
    control,
    name: ["date", "time", "medium", "opening_template_id", "agent_id"],
  });
  const agentName = agents.find((agent) => agent.id === agentId)?.name ?? "El agente";
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);
  if (!valid) return null;
  const iso = businessDateTimeToIso(date, time, tz);
  const notice = windowNotice(reach, contactFirstName, tz, hasApprovedTemplates, iso, now);
  const sentence = promiseSentence({
    agent_name: agentName,
    contact_first_name: contactFirstName,
    iso,
    tz,
    medium,
    opens_with_template: notice.needs_template && templateId !== NO_TEMPLATE,
    waits_for_customer: notice.waits_for_customer,
    quiet_shift:
      settings === null
        ? { quiet: false }
        : quietHoursShift(date, time, settings.quiet_start_hour, settings.quiet_end_hour),
  });
  return (
    <div className="flex items-start gap-2 rounded-xl bg-secondary/70 px-3 py-2.5 text-sm">
      <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-violet" />
      <div>
        <p className="font-medium">{sentence.headline}</p>
        <p className="text-xs text-muted-foreground">{sentence.detail}</p>
      </div>
    </div>
  );
}

