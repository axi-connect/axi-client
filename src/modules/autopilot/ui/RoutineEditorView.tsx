"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { FormStep } from "@/shared/components/features/form-steps";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import { OptionsInput } from "@/shared/components/features/options-input";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SegmentedControl } from "@/shared/components/ui/segmented";
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
  ROUTINE_MODE_META,
  ROUTINE_MODES,
  scheduleLabel,
  sourceHints,
  sourceLabel,
  toRoutineInput,
  validateRoutine,
  WEEKDAYS,
  type Estimate,
  type RoutineInput,
} from "../domain/autopilot";
import { previewHeadline, previewStops, stepSummaries } from "../domain/copy";
import {
  createRoutine,
  estimateRoutine,
  getRoutine,
  isAutopilotUnavailable,
  updateRoutine,
} from "../infrastructure/autopilot-service.adapter";
import { FlightPreview } from "./recorrido/FlightPreview";
import { Group, Row, Rows } from "./recorrido/GroupedList";

/**
 * Crear o editar un piloto (Piloto, R3): cuatro preguntas en pasos
 * plegables (§9.7) —cerrado, cada paso dice lo elegido; se abre el que tenga un
 * error— con listas agrupadas tipo Ajustes dentro, y al lado «Así sale tu
 * piloto». Los campos, límites, valores por defecto y validaciones son los de
 * siempre. La estimación sale del MISMO cálculo del servidor
 * (`POST /autopilot/estimate`) y se dice en la isla y en la barra.
 */

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
  // Uno abierto a la vez. Un piloto nuevo abre el primero; uno que se edita, ninguno (los resúmenes son la revisión).
  const [openStep, setOpenStep] = useState<"where" | "who" | "how" | "when" | null>(routineId === null ? "where" : null);

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

  // Al abrir un piloto con algo por corregir, se abre ese paso (la barra no deja guardar y lo dice).
  useEffect(() => {
    if (initial === "") return;
    const first = validateRoutine(JSON.parse(initial) as RoutineInput)[0];
    if (first !== undefined) setOpenStep(STEP_OF_FIELD[first.field] ?? null);
  }, [initial]);

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
        title="Los pilotos llegan con la próxima versión"
        description="Tu servidor todavía no trae el motor de los pilotos."
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
  const context = {
    sourceLabel: sourceLabel(draft.source.kind).label,
    sequenceName: sequences.find((entry) => entry.id === draft.follow_up.sequence_id)?.name ?? null,
    agentName: agents.find((entry) => entry.id === draft.contact.agent_id)?.name ?? null,
    channelLabels: draft.contact.channels.map(
      (channel) => CONTACT_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? channel,
    ),
  };
  const preview = previewStops(draft, context);
  const summaries = stepSummaries(draft, context);
  const hints = sourceHints(draft.source.kind);
  const dirty = JSON.stringify(draft) !== initial;
  const isApollo = draft.source.kind === "apollo_people";
  const params = draft.source.params;
  const titles = Array.isArray((params.person as { titles?: unknown } | undefined)?.titles)
    ? ((params.person as { titles: string[] }).titles ?? [])
    : [];
  const stepState = (step: StepId): "done" | "blocked" =>
    problems.some((problem) => STEP_OF_FIELD[problem.field] === step) ? "blocked" : "done";
  const toggle = (step: StepId) => setOpenStep((current) => (current === step ? null : step));

  async function save() {
    if (draft === null) return;
    if (problems.length > 0) {
      // Se abre el paso del primer error: dice qué falta donde se arregla.
      setOpenStep(STEP_OF_FIELD[problems[0]?.field ?? ""] ?? null);
      return;
    }
    setSaving(true);
    try {
      if (routineId === null) {
        const created = await createRoutine(draft);
        showAlert({ tone: "success", title: "Piloto creado", description: "Sale solo en su horario." });
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
    <div className="flex min-w-0 flex-col gap-5 pb-24">
      <MarketingHeader
        kicker="Marketing · Pilotos"
        title={routineId === null ? "Nuevo piloto" : draft.name || "Piloto"}
        description="Cuatro preguntas. Cada una dice qué va a pasar y cuánto cuesta."
      />

      {/* Los cuatro pasos a la izquierda; «Así sale tu piloto» a la derecha (fija al bajar) o al final en el celular. */}
      <div className="@container/ed">
        <div className="grid gap-4 @[60rem]/ed:grid-cols-[minmax(0,1fr)_20rem] @[60rem]/ed:items-start">
          <div className="flex min-w-0 flex-col gap-3">
            <FormStep {...STEP_LOOK} number={1} title="¿Dónde busca?" summary={summaries.where} state={stepState("where")} open={openStep === "where"} onToggle={() => toggle("where")}>
              <Group foot={hints.search}>
                <Rows>
                  <Row label="Nombre" htmlFor="route-name" stack>
                    <Input
                      id="route-name"
                      value={draft.name}
                      maxLength={120}
                      placeholder="Restaurantes de Medellín · decisores"
                      onChange={(event) => set({ name: event.target.value })}
                    />
                  </Row>
                  <Row label="Fuente">
                    <Select value={draft.source.kind} onValueChange={(kind) => set({ source: { kind, params: {} } })}>
                      <SelectTrigger aria-label="Fuente" className="w-52 max-w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        {sources.map((source) => (
                          <SelectItem key={source.source} value={source.source} disabled={!source.available} className="whitespace-normal">
                            {sourceLabel(source.source).label}
                            {source.available ? "" : " · no disponible"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Row>
                  <Row label="Ciudad" htmlFor="route-city">
                    <Input
                      id="route-city"
                      className="w-44 max-w-full"
                      value={typeof params.city === "string" ? params.city : ""}
                      placeholder="Medellín"
                      onChange={(event) => set({ source: { ...draft.source, params: { ...params, city: event.target.value } } })}
                    />
                  </Row>
                  {isApollo ? (
                    <Row label="Cargos" hint="Hasta 10" stack>
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
                    </Row>
                  ) : (
                    <Row label="Tipo de negocio">
                      <Select
                        value={typeof params.category === "string" ? params.category : ""}
                        onValueChange={(category) => set({ source: { ...draft.source, params: { ...params, category } } })}
                      >
                        <SelectTrigger aria-label="Tipo de negocio" className="w-52 max-w-full">
                          <SelectValue placeholder="Elige una categoría" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[calc(100vw-2rem)]">
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.label} className="whitespace-normal">
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Row>
                  )}
                </Rows>
              </Group>
            </FormStep>

            <FormStep {...STEP_LOOK} number={2} title="¿A quién deja pasar?" summary={summaries.who} state={stepState("who")} open={openStep === "who"} onToggle={() => toggle("who")}>
              <Group foot="Lo que no califica no gasta contacto.">
                <Rows>
                  <Row label="Puntaje mínimo" stack>
                    <span className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={draft.qualify.min_score}
                        aria-label="Puntaje mínimo"
                        className="accent-foreground min-w-0 flex-1"
                        onChange={(event) => set({ qualify: { ...draft.qualify, min_score: Number(event.target.value) } })}
                      />
                      <span className="text-muted-foreground w-20 shrink-0 text-right text-sm tabular-nums">{String(draft.qualify.min_score)} de 100</span>
                    </span>
                  </Row>
                  <SwitchRow
                    label="Exigir que se identifique quién decide"
                    checked={draft.qualify.require_decision_maker}
                    onChange={(checked) => set({ qualify: { ...draft.qualify, require_decision_maker: checked } })}
                  />
                  <SwitchRow
                    label="Revelar el correo de quien decide"
                    hint={hints.revealEmail}
                    checked={draft.qualify.reveal_email}
                    onChange={(checked) => set({ qualify: { ...draft.qualify, reveal_email: checked } })}
                  />
                  <SwitchRow
                    label="Revelar también el celular"
                    hint={hints.revealPhone}
                    checked={draft.qualify.reveal_phone}
                    onChange={(checked) => set({ qualify: { ...draft.qualify, reveal_phone: checked } })}
                  />
                </Rows>
              </Group>
            </FormStep>

            <FormStep {...STEP_LOOK} number={3} title="¿Cómo les escribe?" summary={summaries.how} state={stepState("how")} open={openStep === "how"} onToggle={() => toggle("how")}>
              <Group title="Antes de escribirles" foot={ROUTINE_MODE_META[draft.mode].hint}>
                <SegmentedControl
                  label="Antes de escribirles"
                  surface="inline"
                  className="w-full [&>button]:flex-1 [&>button]:justify-center"
                  value={draft.mode}
                  onValueChange={(mode) => set({ mode })}
                  items={ROUTINE_MODES.map((mode) => ({ value: mode, label: ROUTINE_MODE_META[mode].label }))}
                />
              </Group>
              <Group title="Por dónde" foot="Siempre dentro de tu política de contacto.">
                <Rows>
                  {CONTACT_CHANNEL_OPTIONS.map((option) => {
                    const checked = draft.contact.channels.includes(option.value);
                    return (
                      <label key={option.value} className="flex min-h-12 cursor-pointer items-center justify-between gap-3.5 px-4 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          aria-label={option.label}
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
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium">{option.label}</span>
                          <span className="text-muted-foreground text-xs text-pretty">{option.hint}</span>
                        </span>
                        <Check aria-hidden className={checked ? "text-brand size-[18px] shrink-0" : "size-[18px] shrink-0 opacity-0"} />
                      </label>
                    );
                  })}
                </Rows>
              </Group>
              <Group title="Cuando responden" foot="La secuencia se detiene si responde, si agenda o si se da de baja.">
                <Rows>
                  <Row label="Quién conversa">
                    <Select value={draft.contact.agent_id ?? ""} onValueChange={(agentId) => set({ contact: { ...draft.contact, agent_id: agentId } })}>
                      <SelectTrigger aria-label="Agente" className="w-44 max-w-full">
                        <SelectValue placeholder="Elige un agente" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id} className="whitespace-normal">
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Row>
                  <Row label="Meta de la conversación" htmlFor="route-goal" stack>
                    <Input
                      id="route-goal"
                      value={draft.contact.goal}
                      maxLength={500}
                      placeholder="Agendar una demo con quien decide"
                      onChange={(event) => set({ contact: { ...draft.contact, goal: event.target.value } })}
                    />
                  </Row>
                  <Row label="Secuencia" stack>
                    <Select value={draft.follow_up.sequence_id} onValueChange={(sequenceId) => set({ follow_up: { sequence_id: sequenceId } })}>
                      <SelectTrigger aria-label="Secuencia" className="w-full">
                        <SelectValue placeholder="Elige una secuencia del CRM" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        {sequences.map((sequence) => (
                          <SelectItem key={sequence.id} value={sequence.id} className="whitespace-normal">
                            {sequence.name} · {String(sequence.steps.length)} pasos{sequence.is_active ? "" : " · borrador"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Row>
                </Rows>
              </Group>
            </FormStep>

            <FormStep
              {...STEP_LOOK}
              number={4}
              title="¿Cuándo sale y cuánto gasta?"
              summary={summaries.when}
              state={stepState("when")}
              open={openStep === "when"}
              onToggle={() => toggle("when")}
            >
              <Group title={`Cuándo · hora de ${draft.schedule.timezone}`} foot={scheduleLabel(draft.schedule)}>
                <Rows>
                  <Row label="Días" stack>
                    <span className="flex flex-wrap gap-1.5" role="group" aria-label="Días">
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
                                ? "bg-foreground text-background grid size-9 place-items-center rounded-full text-[12.5px] font-medium"
                                : "border-border grid size-9 place-items-center rounded-full border text-[12.5px] font-medium"
                            }
                            onClick={() =>
                              set({
                                schedule: {
                                  ...draft.schedule,
                                  days: on ? draft.schedule.days.filter((iso) => iso !== day.iso) : [...draft.schedule.days, day.iso].sort((a, b) => a - b),
                                },
                              })
                            }
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </span>
                  </Row>
                  <Row label="Horas" hint="Hasta 6" stack>
                    <OptionsInput
                      value={draft.schedule.times.map(hourLabel)}
                      max={6}
                      ariaLabel="Añadir hora (HH:mm)"
                      onChange={(next) =>
                        set({ schedule: { ...draft.schedule, times: next.map(normalizeTime).filter((time): time is string => time !== null) } })
                      }
                    />
                  </Row>
                  <Row label="Cuentas por salida" hint="Entre 1 y 200" htmlFor="route-leads">
                    <Input
                      id="route-leads"
                      type="number"
                      min={1}
                      max={200}
                      className="w-24"
                      value={draft.schedule.leads_per_run}
                      onChange={(event) => set({ schedule: { ...draft.schedule, leads_per_run: Number(event.target.value) } })}
                    />
                  </Row>
                </Rows>
              </Group>
              <Group title="Cuánto gasta" foot="Nunca pasa del tope. Si se acaba, la salida termina y te avisa.">
                <Rows>
                  <Row label="Tope por salida" hint="Créditos" htmlFor="route-per-run">
                    <Input
                      id="route-per-run"
                      type="number"
                      min={0}
                      max={10000}
                      className="w-28"
                      value={draft.budget.per_run}
                      onChange={(event) => set({ budget: { ...draft.budget, per_run: Number(event.target.value) } })}
                    />
                  </Row>
                  <Row label="Tope mensual" hint="Créditos" htmlFor="route-per-month">
                    <Input
                      id="route-per-month"
                      type="number"
                      min={0}
                      max={200000}
                      className="w-28"
                      value={draft.budget.per_month}
                      onChange={(event) => set({ budget: { ...draft.budget, per_month: Number(event.target.value) } })}
                    />
                  </Row>
                </Rows>
              </Group>
            </FormStep>
          </div>
          <FlightPreview
            headline={previewHeadline(draft.schedule.leads_per_run, estimate)}
            stops={preview}
            leadsPerRun={draft.schedule.leads_per_run}
            estimate={estimate}
            className="@[60rem]/ed:sticky @[60rem]/ed:top-4"
          />
        </div>
      </div>

      {canManage && (
        <UnsavedChangesDock
          dirty={dirty || routineId === null}
          submitting={saving}
          invalid={problems.length > 0}
          invalidReason={problems[0]?.message}
          submitLabel={routineId === null ? "Crear piloto" : "Guardar cambios"}
          detail={estimate === null ? undefined : `~${String(estimate.credits_per_month)} créditos al mes`}
          onSave={() => void save()}
          onDiscard={routineId === null ? () => router.push("/marketing/autopilot") : () => setDraft(JSON.parse(initial) as RoutineInput)}
        />
      )}
    </div>
  );
}

type StepId = "where" | "who" | "how" | "when";

/**
 * La cara de los pasos del editor (la del mockup): chevrón, y «!» dicho como algo
 * por corregir. El paso plegado desmonta sus campos, como siempre lo hizo aquí.
 */
const STEP_LOOK = { id: "pilot-step", variant: "chevron", blockedHint: "tiene algo por corregir", unmountWhenClosed: true } as const;

/** En qué paso se arregla cada error de `validateRoutine`. */
const STEP_OF_FIELD: Record<string, StepId | undefined> = {
  name: "where",
  source: "where",
  qualify: "who",
  contact: "how",
  follow_up: "how",
  schedule: "when",
  budget: "when",
};

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Row label={label} hint={hint}>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </Row>
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
