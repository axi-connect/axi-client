"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck,
  CircleDollarSign,
  Info,
  Layers,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Play,
  Plus,
  Send,
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
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[62ch] text-sm text-muted-foreground">
          Varios seguimientos en el tiempo con un objetivo por paso. Se detienen solas cuando el
          cliente responde — que es lo único que las separa de mandar tres mensajes seguidos.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setDraft(emptyDraft())}>
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
          description="Empieza por una de las tres de abajo: están redactadas y listas para activar."
        />
      ) : (
        <ul className="grid gap-3">
          {sequences.map((sequence) => (
            <li key={sequence.id} className="grid gap-2.5 rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Layers aria-hidden className="size-4 text-accent-violet" />
                  {sequence.name}
                </h3>
                <StatusBadge
                  status={sequence.is_active ? "active" : "draft"}
                  map={{
                    active: { label: "Activa", tone: "success" },
                    draft: { label: "Borrador", tone: "neutral" },
                  }}
                  appearance="dot"
                />
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setInspecting(sequence)}>
                    <Users aria-hidden className="size-4" />
                    {sequence.active_enrollments} inscritos
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Editar ${sequence.name}`}
                        onClick={() => setDraft(toDraft(sequence))}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        aria-label={`Eliminar ${sequence.name}`}
                        onClick={() => void onDelete(sequence)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <StepFlow steps={sequence.steps} />
              <div className="flex flex-wrap gap-2">
                {sequence.stop_on_reply && <Rule icon={CircleCheck}>Para si responde</Rule>}
                {sequence.stop_on_conversion && <Rule icon={CircleDollarSign}>Para si compra</Rule>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <h3 className="mt-2 text-sm font-semibold">Empieza por una de estas</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {SEQUENCE_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                className="grid gap-1.5 rounded-xl border border-border bg-background p-3 text-left hover:bg-secondary/60"
                onClick={() =>
                  setDraft({ ...emptyDraft(), name: template.name, description: template.description, steps: [...template.steps] })
                }
              >
                <span className="text-sm font-semibold">{template.name}</span>
                <span className="text-xs leading-snug text-muted-foreground">{template.description}</span>
                <span className="text-xs text-muted-foreground">
                  {template.steps.length} {template.steps.length === 1 ? "paso" : "pasos"}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="flex gap-2.5 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
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

function StepFlow({ steps }: { steps: readonly { offset_hours: number; task_channel: FollowUpMedium }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {steps.map((step, index) => {
        const Icon = MEDIUM_ICONS[step.task_channel];
        return (
          <span key={index} className="inline-flex items-center gap-1.5">
            {index > 0 && <span aria-hidden className="opacity-50">→</span>}
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5">
              <Icon aria-hidden className="size-3 text-accent-violet" />
              {offsetLabel(step.offset_hours)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Rule({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-info/35 bg-info/[0.06] px-2.5 py-0.5 text-xs text-muted-foreground">
      <Icon aria-hidden className="size-3 text-info" />
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

  return (
    <div className="flex flex-col gap-4">
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

      <section className="grid gap-3 rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold">Cuándo se detiene sola</h3>
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
        <h3 className="text-sm font-semibold">Los pasos</h3>
        {draft.steps.map((step, index) => {
          const stepProblems = problems.filter((problem) => problem.index === index);
          return (
            <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[130px_1fr]">
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
                    <SelectTrigger aria-label={`Medio del paso ${String(index + 1)}`} className="w-auto min-w-52">
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
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60"
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

      <div className="grid gap-2 rounded-2xl border border-border p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={() => onChange({ ...draft, is_active: !draft.is_active })}
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
              <strong className="font-medium text-foreground">
                {last.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
              </strong>
              . La hora la pone tu horario de trabajo.
            </span>
          </p>
        )}
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
        "grid grid-cols-[auto_1fr] items-start gap-x-2.5 gap-y-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
        checked ? "border-brand bg-accent" : "border-border bg-background hover:bg-secondary/60",
      )}
    >
      <Icon aria-hidden className={cn("row-span-2 mt-0.5 size-4", checked ? "text-accent-violet" : "text-muted-foreground")} />
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs leading-snug text-muted-foreground">{description}</span>
    </button>
  );
}
