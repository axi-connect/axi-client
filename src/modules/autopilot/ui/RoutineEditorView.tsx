"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import { OptionsInput } from "@/shared/components/features/options-input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { getTenantAgents, type AssignableAgent } from "@/modules/agents/public";
import { useMyCompany } from "@/modules/companies/public";
import { listSequences, type SequenceDTO } from "@/modules/crm/public";
import { MarketingHeader } from "@/modules/marketing/ui/components/MarketingHeader";
import { listSources, type DiscoveryCategoryDTO, type SourceCatalogItemDTO } from "@/modules/prospecting/public";

import {
  CONTACT_CHANNEL_OPTIONS,
  defaultRoutineInput,
  hourLabel,
  scheduleLabel,
  sourceLabel,
  toRoutineInput,
  validateRoutine,
  WEEKDAYS,
  type Estimate,
  type RoutineInput,
} from "../domain/autopilot";
import { previewStops } from "../domain/copy";
import {
  createRoutine,
  estimateRoutine,
  getRoutine,
  isAutopilotUnavailable,
  updateRoutine,
} from "../infrastructure/autopilot-service.adapter";
import { FlightPreview } from "./recorrido/FlightPreview";

/**
 * Crear o editar un piloto (tablero 2 del lienzo P0): seis decisiones, y cada
 * una dice qué va a pasar y cuánto cuesta. La estimación sale del MISMO
 * cálculo del servidor (`POST /autopilot/estimate`), no de una copia aquí.
 */
const MODE_OPTIONS: readonly { value: RoutineInput["mode"]; label: string; hint: string }[] = [
  { value: "assisted", label: "Asistido", hint: "Te pide aprobar el lote antes de escribirle a nadie." },
  { value: "autonomous", label: "Autónomo", hint: "Contacta sin esperar, siempre dentro de tu política y tus topes." },
];

export function RoutineEditorView({ routineId }: { routineId: string | null }) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("leads:manage");
  const { company } = useMyCompany();

  const [draft, setDraft] = useState<RoutineInput | null>(null);
  const [initial, setInitial] = useState<string>("");
  const [sources, setSources] = useState<SourceCatalogItemDTO[]>([]);
  const [categories, setCategories] = useState<DiscoveryCategoryDTO[]>([]);
  const [sequences, setSequences] = useState<SequenceDTO[]>([]);
  const [agents, setAgents] = useState<AssignableAgent[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // Catálogos: fuentes, secuencias y agentes. Una sola vez.
  useEffect(() => {
    void Promise.all([listSources(), listSequences(), getTenantAgents()])
      .then(([catalog, sequenceList, agentList]) => {
        setSources(catalog.items);
        setCategories(catalog.categories);
        setSequences(sequenceList.data);
        setAgents(agentList);
      })
      .catch((caught: unknown) =>
        showAlert({ tone: "error", title: "No pudimos leer los catálogos", description: errorMessage(caught) }),
      );
  }, [showAlert]);

  // El borrador: el piloto que se edita, o uno nuevo con valores prudentes.
  useEffect(() => {
    if (routineId === null) {
      if (company === null || company === undefined) return;
      const fresh = defaultRoutineInput(company.timezone ?? "America/Bogota");
      setDraft(fresh);
      setInitial(JSON.stringify(fresh));
      return;
    }
    getRoutine(routineId)
      .then((routine) => {
        const input = toRoutineInput(routine);
        setDraft(input);
        setInitial(JSON.stringify(input));
      })
      .catch((caught: unknown) => {
        if (isAutopilotUnavailable(caught)) setUnavailable(true);
        else showAlert({ tone: "error", title: "No pudimos abrir el piloto", description: errorMessage(caught) });
      });
  }, [routineId, company, showAlert]);

  // Valores por defecto que dependen de los catálogos, si el borrador es nuevo.
  useEffect(() => {
    if (draft === null || routineId !== null) return;
    const patch: Partial<RoutineInput> = {};
    if (draft.follow_up.sequence_id === "" && sequences[0] !== undefined) {
      patch.follow_up = { sequence_id: sequences.find((entry) => entry.is_active)?.id ?? sequences[0].id };
    }
    if (draft.contact.agent_id === null && agents[0] !== undefined) {
      patch.contact = { ...draft.contact, agent_id: agents[0].id };
    }
    const available = sources.find((source) => source.available);
    if (!sources.some((source) => source.source === draft.source.kind && source.available) && available !== undefined) {
      patch.source = { kind: available.source, params: {} };
    }
    if (Object.keys(patch).length > 0) setDraft({ ...draft, ...patch });
  }, [draft, sequences, agents, sources, routineId]);

  const problems = useMemo(() => (draft === null ? [] : validateRoutine(draft)), [draft]);

  // La estimación del servidor, sin inundarlo mientras se escribe.
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draft === null || problems.length > 0) return;
    if (estimateTimer.current !== null) clearTimeout(estimateTimer.current);
    estimateTimer.current = setTimeout(() => {
      estimateRoutine(draft)
        .then(setEstimate)
        .catch(() => setEstimate(null));
    }, 400);
    return () => {
      if (estimateTimer.current !== null) clearTimeout(estimateTimer.current);
    };
  }, [draft, problems.length]);

  if (unavailable) {
    return (
      <EmptyState
        icon={Bot}
        title="El piloto llega con la próxima versión"
        description="Tu servidor todavía no trae el motor del piloto automático."
      />
    );
  }
  if (draft === null) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando el piloto">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  const set = (patch: Partial<RoutineInput>) => setDraft({ ...draft, ...patch });
  const preview = previewStops(draft, {
    sourceLabel: sourceLabel(draft.source.kind).label,
    sequenceName: sequences.find((entry) => entry.id === draft.follow_up.sequence_id)?.name ?? null,
    agentName: agents.find((entry) => entry.id === draft.contact.agent_id)?.name ?? null,
    channelLabels: draft.contact.channels.map(
      (channel) => CONTACT_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? channel,
    ),
  });
  const dirty = JSON.stringify(draft) !== initial;
  const isApollo = draft.source.kind === "apollo_people";
  const params = draft.source.params;
  const titles = Array.isArray((params.person as { titles?: unknown } | undefined)?.titles)
    ? ((params.person as { titles: string[] }).titles ?? [])
    : [];

  async function save() {
    if (draft === null || problems.length > 0) return;
    setSaving(true);
    try {
      if (routineId === null) {
        const created = await createRoutine(draft);
        showAlert({ tone: "success", title: "Piloto creado", description: "Se ejecuta solo en su horario." });
        router.push(`/marketing/autopilot/${created.id}`);
      } else {
        await updateRoutine(routineId, draft);
        setInitial(JSON.stringify(draft));
        showAlert({ tone: "success", title: "Piloto actualizado" });
      }
    } catch (caught) {
      showAlert({ tone: "error", title: "No se guardó el piloto", description: errorMessage(caught) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-24">
      <MarketingHeader
        kicker="Marketing · Automatización"
        title={routineId === null ? "Nuevo piloto de captación" : draft.name || "Piloto"}
        description="Seis decisiones. Cada una muestra qué va a pasar y cuánto cuesta."
      />

      {/* Las seis decisiones a la izquierda; «Así vuela tu piloto» a la derecha (fija al bajar) o al final en el celular. */}
      <div className="@container/ed">
        <div className="grid gap-6 @[60rem]/ed:grid-cols-[minmax(0,1fr)_22rem] @[60rem]/ed:items-start">
          <div className="flex min-w-0 flex-col gap-6">

      <Section index={1} title="Dónde busca" hint={isApollo ? "Buscar en Apollo no gasta créditos; revelar sí" : "Buscar es gratis o va por uso de la fuente"}>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Nombre del piloto</span>
          <Input
            value={draft.name}
            maxLength={120}
            placeholder="Restaurantes de Medellín · decisores"
            onChange={(event) => set({ name: event.target.value })}
          />
        </label>
        <div className="grid gap-3 @[36rem]:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Fuente</span>
            <Select value={draft.source.kind} onValueChange={(kind) => set({ source: { kind, params: {} } })}>
              <SelectTrigger aria-label="Fuente">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source.source} value={source.source} disabled={!source.available}>
                    {sourceLabel(source.source).label}
                    {source.available ? "" : " · no disponible"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Ciudad</span>
            <Input
              value={typeof params.city === "string" ? params.city : ""}
              placeholder="Medellín"
              onChange={(event) => set({ source: { ...draft.source, params: { ...params, city: event.target.value } } })}
            />
          </label>
        </div>
        {isApollo ? (
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">Cargos</span>
            <OptionsInput
              value={titles}
              max={10}
              ariaLabel="Añadir cargo"
              onChange={(next) =>
                set({
                  source: {
                    ...draft.source,
                    params: { ...params, person: { titles: next, seniorities: [], include_similar: true } },
                  },
                })
              }
            />
          </div>
        ) : (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Tipo de negocio</span>
            <Select
              value={typeof params.category === "string" ? params.category : ""}
              onValueChange={(category) => set({ source: { ...draft.source, params: { ...params, category } } })}
            >
              <SelectTrigger aria-label="Tipo de negocio">
                <SelectValue placeholder="Elige una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.label}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </Section>

      <Section index={2} title="A quién deja pasar" hint="Lo que no califica no gasta contacto">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Puntaje mínimo · {String(draft.qualify.min_score)} de 100</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draft.qualify.min_score}
            aria-label="Puntaje mínimo"
            className="accent-primary"
            onChange={(event) => set({ qualify: { ...draft.qualify, min_score: Number(event.target.value) } })}
          />
        </label>
        <ToggleRow
          label="Exigir que se identifique quién decide"
          checked={draft.qualify.require_decision_maker}
          onChange={(checked) => set({ qualify: { ...draft.qualify, require_decision_maker: checked } })}
        />
        <ToggleRow
          label="Revelar el correo de quien decide"
          hint="1 crédito de Apollo, solo si lo encuentra"
          checked={draft.qualify.reveal_email}
          onChange={(checked) => set({ qualify: { ...draft.qualify, reveal_email: checked } })}
        />
        <ToggleRow
          label="Revelar también el celular"
          hint="8 créditos de Apollo, solo si lo encuentra"
          checked={draft.qualify.reveal_phone}
          onChange={(checked) => set({ qualify: { ...draft.qualify, reveal_phone: checked } })}
        />
      </Section>

      <Section index={3} title="Cómo contacta" hint="Siempre dentro de tu política de contacto">
        {/* El modo decide si se contacta sin mirar: va aquí, con su explicación entera. */}
        <fieldset className="grid gap-2 @[36rem]:grid-cols-2">
          <legend className="mb-1 text-sm font-medium">Antes de contactar</legend>
          {MODE_OPTIONS.map((option) => (
            <label key={option.value} className="border-border flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm has-[:checked]:border-primary">
              <input
                type="radio"
                name="autopilot-mode"
                value={option.value}
                checked={draft.mode === option.value}
                onChange={() => set({ mode: option.value })}
                className="accent-primary mt-0.5 size-4 shrink-0"
              />
              <span className="grid min-w-0 gap-0.5">
                <span className="font-medium">{option.label}</span>
                <span className="text-muted-foreground text-xs text-pretty">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2 @[36rem]:grid-cols-2">
          <legend className="sr-only">Canales</legend>
          {CONTACT_CHANNEL_OPTIONS.map((option) => {
            const checked = draft.contact.channels.includes(option.value);
            return (
              <label key={option.value} className="border-border flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm">
                <Checkbox
                  checked={checked}
                  onChange={(event) =>
                    set({
                      contact: {
                        ...draft.contact,
                        channels: event.target.checked
                          ? [...draft.contact.channels, option.value]
                          : draft.contact.channels.filter((channel) => channel !== option.value),
                      },
                    })
                  }
                  aria-label={option.label}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs text-pretty">{option.hint}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="grid gap-3 @[36rem]:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Quién conversa cuando responden</span>
            <Select
              value={draft.contact.agent_id ?? ""}
              onValueChange={(agentId) => set({ contact: { ...draft.contact, agent_id: agentId } })}
            >
              <SelectTrigger aria-label="Agente">
                <SelectValue placeholder="Elige un agente" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Meta de la conversación</span>
            <Input
              value={draft.contact.goal}
              maxLength={500}
              placeholder="Agendar una demo con quien decide"
              onChange={(event) => set({ contact: { ...draft.contact, goal: event.target.value } })}
            />
          </label>
        </div>
      </Section>

      <Section index={4} title="Seguimiento" hint="Se detiene si responde, si agenda o si se da de baja">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Secuencia</span>
          <Select
            value={draft.follow_up.sequence_id}
            onValueChange={(sequenceId) => set({ follow_up: { sequence_id: sequenceId } })}
          >
            <SelectTrigger aria-label="Secuencia">
              <SelectValue placeholder="Elige una secuencia del CRM" />
            </SelectTrigger>
            <SelectContent>
              {sequences.map((sequence) => (
                <SelectItem key={sequence.id} value={sequence.id}>
                  {sequence.name} · {String(sequence.steps.length)} pasos{sequence.is_active ? "" : " · borrador"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </Section>

      <Section index={5} title="Cuándo se ejecuta" hint={`Hora local · ${draft.schedule.timezone}`}>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días">
          {WEEKDAYS.map((day) => {
            const on = draft.schedule.days.includes(day.iso);
            return (
              <button
                key={day.iso}
                type="button"
                aria-pressed={on}
                aria-label={day.long}
                className={
                  on
                    ? "bg-foreground text-background grid size-10 place-items-center rounded-full text-sm font-semibold"
                    : "border-border grid size-10 place-items-center rounded-full border text-sm"
                }
                onClick={() =>
                  set({
                    schedule: {
                      ...draft.schedule,
                      days: on
                        ? draft.schedule.days.filter((iso) => iso !== day.iso)
                        : [...draft.schedule.days, day.iso].sort((a, b) => a - b),
                    },
                  })
                }
              >
                {day.short}
              </button>
            );
          })}
        </div>
        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Horas</span>
          <OptionsInput
            value={draft.schedule.times.map(hourLabel)}
            max={6}
            ariaLabel="Añadir hora (HH:mm)"
            onChange={(next) =>
              set({
                schedule: {
                  ...draft.schedule,
                  times: next.map(normalizeTime).filter((time): time is string => time !== null),
                },
              })
            }
          />
        </div>
        <label className="grid max-w-xs gap-1.5 text-sm">
          <span className="font-medium">Cuentas por ejecución</span>
          <Input
            type="number"
            min={1}
            max={200}
            value={draft.schedule.leads_per_run}
            onChange={(event) =>
              set({ schedule: { ...draft.schedule, leads_per_run: Number(event.target.value) } })
            }
          />
        </label>
        <p className="text-muted-foreground text-xs">{scheduleLabel(draft.schedule)}</p>
      </Section>

      <Section index={6} title="Hasta cuánto gasta" hint="Nunca pasa del tope; si se acaba, la ejecución termina y te avisa">
        <div className="grid gap-3 @[36rem]:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Tope por ejecución (créditos)</span>
            <Input
              type="number"
              min={0}
              max={10000}
              value={draft.budget.per_run}
              onChange={(event) => set({ budget: { ...draft.budget, per_run: Number(event.target.value) } })}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Tope mensual (créditos)</span>
            <Input
              type="number"
              min={0}
              max={200000}
              value={draft.budget.per_month}
              onChange={(event) => set({ budget: { ...draft.budget, per_month: Number(event.target.value) } })}
            />
          </label>
        </div>
        <div className="bg-muted/40 rounded-2xl p-4 text-sm" aria-live="polite">
          {estimate === null ? (
            <span className="text-muted-foreground">Completa el piloto para ver cuánto gastaría.</span>
          ) : (
            <span className="text-pretty">
              Estimado:{" "}
              <strong className="tabular-nums">~{String(estimate.credits_per_month)} créditos al mes</strong> ·{" "}
              {String(estimate.runs_per_month)} ejecuciones · hasta {String(estimate.credits_per_run)} por ejecución ·{" "}
              {String(Math.round(estimate.leads_revealed_per_run))} cuentas reveladas por ejecución.
            </span>
          )}
        </div>
      </Section>
          </div>
          <FlightPreview stops={preview} estimate={estimate} className="@[60rem]/ed:sticky @[60rem]/ed:top-4" />
        </div>
      </div>

      {canManage && (
        <UnsavedChangesDock
          dirty={dirty || routineId === null}
          submitting={saving}
          invalid={problems.length > 0}
          invalidReason={problems[0]?.message}
          submitLabel={routineId === null ? "Crear piloto" : "Guardar cambios"}
          detail={estimate === null ? undefined : `Hasta ${String(estimate.credits_per_month)} créditos al mes`}
          onSave={() => void save()}
          onDiscard={routineId === null ? () => router.push("/marketing/autopilot") : () => setDraft(JSON.parse(initial) as RoutineInput)}
        />
      )}
    </div>
  );
}

function Section({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    // `@container` en la sección: sus rejillas consultan a su padre (una consulta no se mide a sí misma).
    <section className="border-border bg-card @container flex min-w-0 flex-col gap-4 rounded-3xl border p-5" aria-labelledby={`section-${String(index)}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`section-${String(index)}`} className="font-heading text-lg font-bold">
          <span className="text-muted-foreground tabular-nums">{String(index)} · </span>
          {title}
        </h2>
        <span className="text-muted-foreground text-xs text-pretty">{hint}</span>
      </header>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{label}</span>
        {hint !== undefined && <span className="text-muted-foreground text-xs">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

/** «8», «8:00», «08:00» → «08:00». `null` si no es una hora. */
function normalizeTime(raw: string): string | null {
  const match = /^(\d{1,2})(?::(\d{2}))?$/.exec(raw.trim());
  if (match === null) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
