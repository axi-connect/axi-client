"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck,
  CircleDollarSign,
  Info,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { InkIsland, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { FollowUpMedium } from "@/modules/crm/domain/schedule-follow-up";
import {
  lastStepAt,
  offsetLabel,
  sequenceStory,
  SEQUENCE_LIMITS,
  SEQUENCE_TEMPLATES,
  toUpsertDTO,
  validateSequence,
  type DraftStep,
  type SequenceDTO,
} from "@/modules/crm/domain/sequences";
import { availableMedia } from "@/modules/crm/ui/forms/config/schedule-follow-up.config";
import { SequenceEnrollmentsSheet } from "@/modules/crm/ui/components/settings/SequenceEnrollmentsSheet";
import {
  createSequence,
  deleteSequence,
  listSequences,
  updateSequence,
} from "@/modules/crm/infrastructure/services/sequences-service.adapter";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";

const MEDIUM_ICONS: Record<FollowUpMedium, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  call: PhoneCall,
  call_then_message: Phone,
};
const MEDIUM_LABELS: Record<FollowUpMedium, string> = {
  message: "Mensaje",
  call: "Llamada",
  call_then_message: "Llamada y si no, mensaje",
};

type Draft = {
  id: string | null;
  name: string;
  description: string;
  stop_on_reply: boolean;
  stop_on_conversion: boolean;
  is_active: boolean;
  steps: DraftStep[];
};

/**
 * Secuencias del agente (F4b).
 *
 * Una secuencia no es un canal nuevo: es la misma tarea de agente, tres veces,
 * con memoria. Lo que esta pantalla tiene que dejar claro es lo único que
 * añade — cuándo se detiene sola — porque es lo que separa un seguimiento de
 * un acoso.
 */
export function SequencesManager() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("crm:automate");
  const { showAlert } = useAlert();

  const [sequences, setSequences] = useState<SequenceDTO[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [inspecting, setInspecting] = useState<SequenceDTO | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSequences((await listSequences()).data);
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudieron cargar las secuencias") });
      setSequences([]);
    }
  }, [showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = useCallback(async () => {
    if (draft === null) return;
    const problems = validateSequence(draft);
    if (problems.length > 0) {
      showAlert({ tone: "error", title: problems[0].message });
      return;
    }
    setSaving(true);
    try {
      const body = toUpsertDTO(draft);
      if (draft.id === null) await createSequence(body);
      else await updateSequence(draft.id, body);
      showAlert({ tone: "success", title: "Secuencia guardada" });
      setDraft(null);
      await load();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar la secuencia") });
    } finally {
      setSaving(false);
    }
  }, [draft, load, showAlert]);

  const onDelete = useCallback(
    async (sequence: SequenceDTO) => {
      try {
        await deleteSequence(sequence.id);
        showAlert({ tone: "success", title: `«${sequence.name}» eliminada` });
        await load();
      } catch (err) {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar") });
      }
    },
    [load, showAlert],
  );

  if (draft !== null) {
    return (
      <SequenceEditor
        draft={draft}
        saving={saving}
        onChange={setDraft}
        onCancel={() => setDraft(null)}
        onSave={() => void onSave()}
      />
    );
  }

  if (sequences === null) return <TableSkeleton rows={3} />;

  return (
    <div className="@container flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[62ch] text-sm text-pretty text-muted-foreground">
          Varios seguimientos en el tiempo con un objetivo por paso. Se detienen solas cuando el
          cliente responde — que es lo único que las separa de mandar tres mensajes seguidos.
        </p>
        {canManage && (
          <Button size="sm" className="rounded-full" onClick={() => setDraft(emptyDraft())}>
            <Plus aria-hidden className="size-4" />
            Nueva secuencia
          </Button>
        )}
      </div>

      {sequences.length === 0 ? (
        <EmptyState
          glyph="ai"
          variant="solid"
          title="Todavía no tienes secuencias"
          description="Una secuencia es un camino de mensajes con días. Empieza por una de abajo: están redactadas y listas para activar."
        />
      ) : (
        <ul className="grid min-w-0 gap-4 @min-[48rem]:grid-cols-2">
          {sequences.map((sequence) => (
            <li key={sequence.id} className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-base font-bold" title={sequence.name}>
                    {sequence.name}
                  </h3>
                  {sequence.description && (
                    <p className="truncate text-xs text-muted-foreground" title={sequence.description}>
                      {sequence.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatePill tone={sequence.is_active ? "success" : "neutral"}>
                    {sequence.is_active ? "Activa" : "Borrador"}
                  </StatePill>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full"
                        aria-label={`Editar ${sequence.name}`}
                        onClick={() => setDraft(toDraft(sequence))}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar ${sequence.name}`}
                        onClick={() => void onDelete(sequence)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <StepFlow steps={sequence.steps} />
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {sequence.stop_on_reply && <Rule icon={CircleCheck}>Para si responde</Rule>}
                  {sequence.stop_on_conversion && <Rule icon={CircleDollarSign}>Para si compra</Rule>}
                </div>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setInspecting(sequence)}>
                  <Users aria-hidden className="size-4" />
                  <span className="tabular-nums">{sequence.active_enrollments}</span>
                  {sequence.active_enrollments === 1 ? "inscrito" : "inscritos"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <section className="rounded-3xl border border-dashed border-border p-5">
          <h3 className="mb-3 text-xs text-muted-foreground">Empieza con una plantilla</h3>
          <div className="grid gap-2 @min-[40rem]:grid-cols-3">
            {SEQUENCE_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                className="flex min-w-0 flex-col gap-1 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() =>
                  setDraft({ ...emptyDraft(), name: template.name, description: template.description, steps: [...template.steps] })
                }
              >
                <span className="text-sm font-semibold">{template.name}</span>
                <span className="text-xs leading-snug text-pretty text-muted-foreground">{template.description}</span>
                <span className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {template.steps.length} {template.steps.length === 1 ? "paso" : "pasos"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="flex gap-2.5 px-1 text-xs text-pretty text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Cada paso es una <strong className="font-medium text-foreground">tarea de agente normal</strong>:
          respeta el horario silencioso, el cupo diario, la baja y la ventana de 24 h, y deja su rail de
          intentos. Una secuencia no añade un canal — añade memoria.
        </span>
      </p>

      <SequenceEnrollmentsSheet sequence={inspecting} onOpenChange={(open) => !open && setInspecting(null)} />
    </div>
  );
}

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    description: "",
    stop_on_reply: true,
    stop_on_conversion: true,
    is_active: false,
    steps: [{ offset_hours: 0, task_channel: "message", objective: "" }],
  };
}

function toDraft(sequence: SequenceDTO): Draft {
  return {
    id: sequence.id,
    name: sequence.name,
    description: sequence.description ?? "",
    stop_on_reply: sequence.stop_on_reply,
    stop_on_conversion: sequence.stop_on_conversion,
    is_active: sequence.is_active,
    steps: sequence.steps.map((step) => ({
      offset_hours: step.offset_hours,
      task_channel: step.task_channel,
      objective: step.objective,
    })),
  };
}

/** El camino de la secuencia: un punto por paso, con su día y su medio. */
function StepFlow({ steps }: { steps: readonly { offset_hours: number; task_channel: FollowUpMedium; objective?: string }[] }) {
  return (
    <ol className="sidebar-scroll flex min-w-0 gap-0 overflow-x-auto pb-1" aria-label="Pasos">
      {steps.map((step, index) => {
        const Icon = MEDIUM_ICONS[step.task_channel];
        const last = index === steps.length - 1;
        return (
          <li key={index} className="flex min-w-[6.5rem] flex-1 flex-col gap-1.5">
            <span className="flex items-center">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
                <Icon aria-hidden className="size-3.5 text-accent-violet" />
              </span>
              {!last && <span aria-hidden className="mx-1.5 h-0.5 flex-1 rounded-full bg-foreground/10" />}
            </span>
            <span className="text-xs font-semibold whitespace-nowrap tabular-nums">{offsetLabel(step.offset_hours)}</span>
            <span className="truncate pr-2 text-xs text-muted-foreground" title={step.objective ?? MEDIUM_LABELS[step.task_channel]}>
              {MEDIUM_LABELS[step.task_channel]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Rule({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap">
      <Icon aria-hidden className="size-3 text-muted-foreground" />
      {children}
    </span>
  );
}

/** El editor: reglas de parada arriba, pasos en vertical, promesa abajo. */
function SequenceEditor({
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Draft;
  saving: boolean;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { hasCapability } = useEntitlements();
  const media = availableMedia(hasCapability("calls"));
  const problems = validateSequence(draft);
  const last = lastStepAt(draft.steps, new Date());
  const patchStep = (index: number, patch: Partial<DraftStep>) =>
    onChange({
      ...draft,
      steps: draft.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    });

  const story = sequenceStory(draft, new Date());

  return (
    <div className="@container min-w-0">
      <div className="grid min-w-0 items-start gap-4 @min-[56rem]:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid flex-1 gap-2">
              <Input
                aria-label="Nombre de la secuencia"
                placeholder="Post-captación"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
                className="max-w-sm"
              />
              <Input
                aria-label="Descripción"
                placeholder="Para qué sirve, en una línea"
                value={draft.description}
                onChange={(e) => onChange({ ...draft, description: e.target.value })}
                className="max-w-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
              <Button size="sm" disabled={saving || problems.length > 0} onClick={onSave}>
                {saving ? "Guardando…" : "Guardar secuencia"}
              </Button>
            </div>
          </div>

          <section className="grid gap-3 rounded-3xl border border-border bg-card p-5">
            <h3 className="font-heading text-base font-bold">Cuándo se detiene sola</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <StopRule
                checked={draft.stop_on_reply}
                icon={CircleCheck}
                title="Para si responde"
                description="En cuanto el cliente escribe o contesta la llamada, los pasos que quedan se cancelan."
                onToggle={() => onChange({ ...draft, stop_on_reply: !draft.stop_on_reply })}
              />
              <StopRule
                checked={draft.stop_on_conversion}
                icon={CircleDollarSign}
                title="Para si compra"
                description="Una oportunidad ganada cierra la secuencia como cumplida."
                onToggle={() => onChange({ ...draft, stop_on_conversion: !draft.stop_on_conversion })}
              />
            </div>
            {!draft.stop_on_reply && (
              <p className="flex items-start gap-2 text-xs text-warning">
                <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Sin esto la secuencia sigue escribiendo a quien ya te contestó. Es la diferencia entre un
                seguimiento y un acoso.
              </p>
            )}
          </section>

          <section className="grid gap-2">
            <h3 className="px-1 font-heading text-base font-bold">Los pasos</h3>
            {draft.steps.map((step, index) => {
              const stepProblems = problems.filter((problem) => problem.index === index);
              return (
                <div key={index} className="grid gap-3 rounded-3xl border border-border bg-card p-4 @min-[36rem]:grid-cols-[8rem_minmax(0,1fr)]">
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Espera</span>
                    <Input
                      type="number"
                      aria-label={`Espera del paso ${String(index + 1)} en horas`}
                      min={SEQUENCE_LIMITS.offset_hours.min}
                      max={SEQUENCE_LIMITS.offset_hours.max}
                      value={step.offset_hours}
                      onChange={(e) => patchStep(index, { offset_hours: Number(e.target.value) })}
                    />
                    <span className="text-xs text-muted-foreground">{offsetLabel(step.offset_hours)}</span>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={step.task_channel}
                        onValueChange={(value) => patchStep(index, { task_channel: value as FollowUpMedium })}
                      >
                        <SelectTrigger aria-label={`Medio del paso ${String(index + 1)}`} className="w-full min-w-0 @min-[36rem]:w-auto @min-[36rem]:min-w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {media.map((medium) => (
                            <SelectItem key={medium} value={medium}>
                              {MEDIUM_LABELS[medium]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {draft.steps.length > SEQUENCE_LIMITS.steps.min && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto size-8 text-destructive hover:text-destructive"
                          aria-label={`Quitar el paso ${String(index + 1)}`}
                          onClick={() => onChange({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <Input
                      aria-label={`Objetivo del paso ${String(index + 1)}`}
                      placeholder="Una meta en tus palabras, no un guion"
                      value={step.objective}
                      onChange={(e) => patchStep(index, { objective: e.target.value })}
                    />
                    {stepProblems.map((problem) => (
                      <p key={problem.message} className="text-xs text-destructive">
                        {problem.message}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
            {draft.steps.length < SEQUENCE_LIMITS.steps.max && (
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50"
                onClick={() =>
                  onChange({
                    ...draft,
                    steps: [
                      ...draft.steps,
                      {
                        offset_hours: (draft.steps.at(-1)?.offset_hours ?? 0) + 48,
                        task_channel: "message",
                        objective: "",
                      },
                    ],
                  })
                }
              >
                <Plus aria-hidden className="size-4" />
                Añadir paso
              </button>
            )}
          </section>

          <div className="grid gap-2 rounded-3xl border border-border bg-card p-5">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
          <Switch
            checked={draft.is_active}
            onCheckedChange={(checked) => onChange({ ...draft, is_active: checked })}
            aria-label="Activa"
          />
              <Play aria-hidden className="size-4 text-accent-violet" />
              Activa — un borrador no admite inscripciones
            </label>
            {last !== null && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Send aria-hidden className="mt-0.5 size-3.5 shrink-0 text-info" />
                <span>
                  Los días se cuentan <strong className="font-medium text-foreground">desde la inscripción</strong>:
                  quien entre hoy recibirá el último paso el{" "}
                  <strong className="font-medium whitespace-nowrap text-foreground">
                    {last.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                  </strong>
                  . La hora la pone tu horario de trabajo.
                </span>
              </p>
            )}
          </div>
        </div>

        <InkIsland label="Así lo vive el contacto" glow="ai" className="gap-4 p-5 @min-[56rem]:sticky @min-[56rem]:top-4">
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.12em] uppercase opacity-70">
            <Sparkles aria-hidden className="size-3 text-accent-violet" />
            Así lo vive el contacto
          </p>
          {story === null ? (
            <p className="text-sm text-muted-foreground">Añade un paso para ver cómo le llega.</p>
          ) : (
            <>
              <p className="font-heading text-xl leading-tight font-bold text-pretty">{story.headline}</p>
              <ol className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                {story.days.map((day, index) => (
                  <li key={index} className="contents">
                    <span className="font-semibold whitespace-nowrap first-letter:uppercase">{day.when}</span>
                    <span className="min-w-0 text-pretty text-muted-foreground">
                      {MEDIUM_LABELS[day.channel]}
                      {day.objective ? ` · ${day.objective}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="border-t border-foreground/10 pt-3 text-xs text-pretty text-muted-foreground">
                Fechas de quien se inscriba hoy. La hora la pone tu horario de trabajo; nada sale en horario silencioso
                ni por encima del cupo diario.
              </p>
            </>
          )}
        </InkIsland>
      </div>
    </div>
  );
}

function StopRule({
  checked,
  icon: Icon,
  title,
  description,
  onToggle,
}: {
  checked: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "grid grid-cols-[auto_1fr] items-start gap-x-2.5 gap-y-1 rounded-2xl border px-3.5 py-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        checked ? "border-foreground bg-card shadow-[0_0_0_1px_var(--foreground)]" : "border-border bg-card hover:bg-muted/50",
      )}
    >
      <Icon aria-hidden className={cn("row-span-2 mt-0.5 size-4", checked ? "text-accent-violet" : "text-muted-foreground")} />
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{description}</span>
    </button>
  );
}
