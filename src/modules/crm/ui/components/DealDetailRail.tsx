"use client";

import {
  CalendarPlus,
  Check,
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  Pencil,
  RotateCcw,
  Sparkles,
  X as XIcon,
  XCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { type DealDTO, type DealEventDTO, type DealStatus } from "@/modules/crm/domain/deal";
import { canTransition, daysInStage } from "@/modules/crm/domain/deal-state";
import {
  daysLabel,
  describeDealEvent,
  formatCloseDate,
  stageRoute,
  stallInfo,
  weightedCents,
} from "@/modules/crm/domain/pipeline-summary";
import { getDeal, getDealEvents, updateDeal } from "@/modules/crm/infrastructure/services/deals-service.adapter";
import { getTenantUsers } from "@/modules/crm/infrastructure/services/tenant-users.cache";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Kicker, StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";

import { WinLoseDialog, type WinLoseRequest } from "./kanban/WinLoseDialog";

const NO_OWNER = "__none__";

const STATUS_TONE: Record<DealStatus, StatePillTone> = {
  open: "neutral",
  won: "success",
  lost: "destructive",
};

const STATUS_PILL: Record<DealStatus, string> = {
  open: "Abierta",
  won: "Ganada",
  lost: "Perdida",
};

function eventDotClass(event: DealEventDTO): string {
  if (event.type === "won") return "bg-success";
  if (event.type === "lost") return "bg-destructive";
  if (event.type === "stalled") return "bg-warning";
  if (event.actor_type === "ai_agent") return "border-2 border-accent-violet";
  return "border-2 border-foreground/70";
}

function eventActor(event: DealEventDTO): string {
  if (event.actor_type === "ai_agent") return event.actor_name ? `${event.actor_name}, el agente` : "Axi";
  if (event.actor_type === "system") return "Sistema";
  return event.actor_name ?? "Alguien del equipo";
}

/** Una sección del cuerpo del panel: separadas por un filo, nunca por cajas. */
function Section({ label, children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("space-y-3 border-t border-border px-5 py-4 first:border-t-0 sm:px-6", className)}>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-10 grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-3 text-sm">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-2">{children}</dd>
    </div>
  );
}

/**
 * Panel de la oportunidad (lienzo CRM premium F1, tablero 4). Cuenta, en este
 * orden, cuánto vale y cuánto pesa, dónde va en el recorrido y si se enfría,
 * los datos editables, qué sigue, y el historial legible. La decisión —ganar,
 * perder, reabrir— vive en una barra fija abajo, siempre a la vista.
 *
 * Tiene UN solo scroller (el cuerpo), con la barra de marca: la cabecera y la
 * barra de pie no scrollean. Escucha `crm:deal:detail:refresh` (lo emite el
 * board.store ante eventos WS).
 */
export function DealDetailRail({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("crm:manage");
  const canAutomate = hasPermission("crm:automate");
  const transition = useBoardStore((s) => s.transition);
  const refreshBoardDeal = useBoardStore((s) => s.refreshDeal);
  const pipelines = useBoardStore((s) => s.pipelines);

  const [deal, setDeal] = useState<DealDTO | null>(null);
  const [events, setEvents] = useState<DealEventDTO[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [editingValue, setEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [winLose, setWinLose] = useState<WinLoseRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const [fresh, freshEvents] = await Promise.all([getDeal(dealId), getDealEvents(dealId)]);
      setDeal(fresh);
      setEvents(freshEvents);
      setNotesDraft(fresh.notes ?? "");
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo cargar la oportunidad") });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  useEffect(() => {
    void load();
    getTenantUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
    const onRefresh = (e: Event) => {
      if ((e as CustomEvent).detail?.deal_id === dealId) void load();
    };
    window.addEventListener("crm:deal:detail:refresh", onRefresh);
    return () => window.removeEventListener("crm:deal:detail:refresh", onRefresh);
  }, [dealId, load]);

  const stages = useMemo(() => {
    const pipeline = pipelines.find((p) => p.id === deal?.pipeline_id);
    return pipeline ? [...pipeline.stages].sort((a, b) => a.position - b.position) : [];
  }, [pipelines, deal?.pipeline_id]);
  const stageNames = useMemo(() => new Map(stages.map((stage) => [stage.id, stage.name])), [stages]);

  const patch = async (dto: Parameters<typeof updateDeal>[1], successTitle: string) => {
    try {
      const fresh = await updateDeal(dealId, dto);
      setDeal(fresh);
      void refreshBoardDeal(dealId);
      showAlert({ tone: "success", title: successTitle });
      void getDealEvents(dealId).then(setEvents).catch(() => undefined);
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar") });
    }
  };

  const handleReopen = async () => {
    const result = await transition(dealId, "reopen");
    if (result.ok) {
      showAlert({ tone: "success", title: "Oportunidad reabierta" });
      void load();
    } else {
      showAlert({ tone: "error", title: result.message });
    }
  };

  const contactName = deal?.contact.full_name ?? deal?.contact.phone ?? "Sin contacto";

  return (
    <aside
      aria-label="Detalle de la oportunidad"
      className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-card lg:rounded-3xl lg:border lg:border-border lg:shadow-overlay"
    >
      {deal === null ? (
        <div className="flex flex-1 items-center justify-center" role="status" aria-label="Cargando la oportunidad">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        renderBody()
      )}
      {winLose !== null && (
        <WinLoseDialog
          request={winLose}
          onOpenChange={(open) => {
            if (!open) {
              setWinLose(null);
              void load();
            }
          }}
        />
      )}
    </aside>
  );

  // Se llama como función, no como <Componente/>: definido dentro del render,
  // un componente sería un tipo nuevo en cada render y React remontaría el
  // cuerpo en cada tecla (el campo del valor y las notas perderían el foco).
  function renderBody() {
    if (deal === null) return null;
    const stage = stages.find((s) => s.id === deal.stage_id);
    const route = stageRoute(stages, deal.stage_id);
    const stall = stallInfo(deal, stage?.rotting_days);
    const inStage = daysInStage(deal.stage_entered_at);
    const weighted = weightedCents(deal.value_cents, deal.stage.probability_pct);
    const isOpen = deal.status === "open";
    const followUpQuery = `contact_id=${deal.contact_id}&contact_label=${encodeURIComponent(contactName)}&deal_id=${deal.id}`;

    return (
      <>
        <header className="shrink-0 space-y-3 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <Kicker>Oportunidad</Kicker>
            <Button variant="outline" size="icon" className="size-9 rounded-full" aria-label="Cerrar detalle" onClick={onClose}>
              <XIcon className="size-4" />
            </Button>
          </div>
          <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight text-pretty break-words">{deal.title}</h2>
          <div className="flex flex-wrap gap-1.5">
            <StatePill tone={STATUS_TONE[deal.status]}>{STATUS_PILL[deal.status]}</StatePill>
            {deal.source === "ai_conversation" && (
              <span className="inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium">
                <Sparkles className="size-3 shrink-0 text-accent-violet" aria-hidden="true" />
                <span className="truncate">La abrió Axi desde una conversación</span>
              </span>
            )}
          </div>
        </header>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border">
          <Section label="Valor">
            <div className="flex min-w-0 items-end justify-between gap-3">
              {editingValue ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cents = valueDraft.trim() === "" ? null : parseMoneyToCents(valueDraft);
                    if (valueDraft.trim() !== "" && cents === null) return;
                    setEditingValue(false);
                    void patch({ value_cents: cents ?? undefined }, "Valor actualizado");
                  }}
                >
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-xl font-heading text-xl font-bold tabular-nums"
                    aria-label="Nuevo valor"
                  />
                  <Button type="submit" size="icon" className="size-9 rounded-full" aria-label="Guardar valor">
                    <Check className="size-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="size-9 rounded-full" aria-label="Cancelar" onClick={() => setEditingValue(false)}>
                    <XIcon className="size-4" />
                  </Button>
                </form>
              ) : (
                <>
                  <p
                    className={cn(
                      "min-w-0 truncate font-heading leading-none font-bold tracking-tight tabular-nums",
                      deal.value_cents !== null ? "text-4xl" : "text-2xl text-muted-foreground",
                    )}
                    title={deal.value_cents !== null ? formatMoney(deal.value_cents, deal.currency) : undefined}
                  >
                    {deal.value_cents !== null ? formatMoney(deal.value_cents, deal.currency) : "Sin valor"}
                  </p>
                  {isOpen && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-full"
                      onClick={() => {
                        setValueDraft(deal.value_cents !== null ? (deal.value_cents / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 }) : "");
                        setEditingValue(true);
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      {deal.value_cents !== null ? "Editar" : "Ponerle valor"}
                    </Button>
                  )}
                </>
              )}
            </div>
            <p className="text-[13px] text-pretty text-muted-foreground">
              {deal.value_cents === null
                ? "Sin valor no suma al pronóstico."
                : isOpen
                  ? <>Pesa <span className="whitespace-nowrap">{formatMoney(weighted, deal.currency)}</span> en el pronóstico · <span className="whitespace-nowrap">{deal.stage.probability_pct} % de {deal.stage.name}</span></>
                  : deal.status === "won"
                    ? "Suma a Ganadas con este valor."
                    : deal.lost_reason ? `Motivo: ${deal.lost_reason}` : "Se perdió sin motivo anotado."}
            </p>
          </Section>

          {isOpen && route !== null && (
            <Section label="Recorrido por las etapas">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Etapa {route.index} de {route.total}
                </span>
                {stall !== null && <StatePill tone="warning">Se enfría</StatePill>}
              </div>
              <ol className="relative flex items-center justify-between" aria-label="Etapas del pipeline">
                <span aria-hidden="true" className="absolute inset-x-2.5 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-muted" />
                <span
                  aria-hidden="true"
                  className="absolute left-2.5 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground"
                  style={{ width: route.total > 1 ? `calc((100% - 1.25rem) * ${(route.index - 1) / (route.total - 1)})` : 0 }}
                />
                {stages.map((s, index) => {
                  const done = index + 1 < route.index;
                  const current = s.id === deal.stage_id;
                  return (
                    <li
                      key={s.id}
                      aria-current={current ? "step" : undefined}
                      title={s.name}
                      className={cn(
                        "relative z-10 flex size-5 items-center justify-center rounded-full",
                        done && "bg-foreground text-background",
                        current && "border-2 border-brand bg-card ring-4 ring-brand/15",
                        !done && !current && "bg-card",
                      )}
                    >
                      {done ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : null}
                      {current ? <span aria-hidden="true" className="size-2 rounded-full bg-brand" /> : null}
                      {!done && !current ? <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground/40" /> : null}
                      <span className="sr-only">
                        {s.name}
                        {done ? ", recorrida" : current ? ", etapa actual" : ""}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="text-[13px] text-pretty">
                {stall !== null ? (
                  <>
                    Lleva <strong className="font-semibold">{daysLabel(stall.days)} en {deal.stage.name}</strong> y esta etapa aguanta{" "}
                    {stall.limit}. Un seguimiento hoy la mueve.
                  </>
                ) : (
                  <>
                    {inStage === 0 ? "Entró hoy a " : `Lleva ${daysLabel(inStage)} en `}
                    <strong className="font-semibold">{deal.stage.name}</strong>
                    {stage?.rotting_days ? `; la etapa aguanta ${stage.rotting_days}.` : "."}
                  </>
                )}
              </p>
            </Section>
          )}

          <Section label="Datos" className="py-2">
            <dl>
              <Fact label="Cierre esperado">
                {isOpen ? (
                  <input
                    type="date"
                    value={deal.expected_close_date?.slice(0, 10) ?? ""}
                    onChange={(e) => void patch({ expected_close_date: e.target.value || undefined }, "Fecha actualizada")}
                    className="h-9 min-w-0 rounded-full border border-border bg-card px-3 text-sm tabular-nums"
                    aria-label="Fecha de cierre esperada"
                  />
                ) : (
                  <span className="truncate">{deal.expected_close_date !== null ? formatCloseDate(deal.expected_close_date, true) : "Sin fecha"}</span>
                )}
              </Fact>
              <Fact label="Responsable">
                <Select
                  value={deal.owner_user_id ?? NO_OWNER}
                  onValueChange={(value: string) =>
                    void patch({ owner_user_id: value === NO_OWNER ? undefined : value }, "Responsable actualizado")
                  }
                  disabled={!canManage || !isOpen}
                >
                  <SelectTrigger className="h-9 w-full max-w-[13rem] min-w-0 rounded-full" aria-label="Responsable de la oportunidad">
                    <SelectValue placeholder="Sin responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OWNER}>Sin responsable</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Fact>
              <Fact label="Contacto">
                <Link
                  href={`/crm/contacts/${deal.contact_id}`}
                  className="inline-flex min-h-6 min-w-0 items-center gap-2 font-medium underline-offset-4 hover:underline"
                >
                  <Avatar src={deal.contact.avatar_url} alt="" fallback={contactName} size={22} />
                  <span className="truncate" title={contactName}>
                    {contactName}
                  </span>
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                </Link>
              </Fact>
              {deal.conversation_id !== null && (
                <Fact label="Origen">
                  <Link
                    href={`/workspace/inbox/${deal.conversation_id}`}
                    className="inline-flex min-h-6 items-center gap-1.5 font-medium whitespace-nowrap underline-offset-4 hover:underline"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Ver la conversación
                  </Link>
                </Fact>
              )}
            </dl>
          </Section>

          {isOpen && (
            <Section label="Seguimiento">
              <div className="grid gap-2">
                <Button asChild variant="outline" className="min-w-0 rounded-full">
                  <Link href={`/crm/tasks/create?${followUpQuery}`}>
                    <CalendarPlus className="size-4" aria-hidden="true" />
                    <span className="truncate">Agendar seguimiento</span>
                  </Link>
                </Button>
                {canAutomate && (
                  <Button asChild variant="outline" className="min-w-0 rounded-full">
                    <Link href={`/crm/tasks/create?executor=agent&${followUpQuery}`}>
                      <Sparkles className="size-4 text-accent-violet" aria-hidden="true" />
                      <span className="truncate">Que le escriba Axi</span>
                    </Link>
                  </Button>
                )}
              </div>
            </Section>
          )}

          <Section label="Historial">
            <h3 className="text-xs text-muted-foreground">Historial</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún sin movimientos.</p>
            ) : (
              <ol className="space-y-1">
                {[...events].reverse().map((event) => (
                  <li key={event.id} className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-start gap-3 py-1.5">
                    <span aria-hidden="true" className={cn("mt-1.5 size-2.5 rounded-full", eventDotClass(event))} />
                    <div className="min-w-0">
                      <p className="text-[13px] leading-snug text-pretty break-words">
                        {describeDealEvent(event, stageNames, deal.currency)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{eventActor(event)}</p>
                    </div>
                    <time dateTime={event.created_at} className="mt-0.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                      {relativeTime(event.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section label="Notas">
            <label htmlFor="deal-notes" className="text-xs text-muted-foreground">
              Notas internas
            </label>
            <Textarea
              id="deal-notes"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={3}
              placeholder="Lo que el equipo debe saber de esta oportunidad…"
              className="max-h-48 resize-y rounded-xl"
              disabled={!isOpen}
            />
            {isOpen && notesDraft !== (deal.notes ?? "") && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => void patch({ notes: notesDraft }, "Notas guardadas")}>
                Guardar notas
              </Button>
            )}
          </Section>
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-border bg-card px-5 py-4 sm:px-6">
          {canTransition(deal.status, "lost") && (
            <Button
              variant="outline"
              className="min-w-0 flex-1 rounded-full text-destructive hover:text-destructive"
              onClick={() => setWinLose({ deal, action: "lose" })}
            >
              <XCircle className="size-4" aria-hidden="true" />
              <span className="truncate">Marcar perdida</span>
            </Button>
          )}
          {canTransition(deal.status, "won") && (
            <Button className="min-w-0 flex-1 rounded-full" onClick={() => setWinLose({ deal, action: "win" })}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span className="truncate">Marcar ganada</span>
            </Button>
          )}
          {canTransition(deal.status, "open") && (
            <Button variant="outline" className="min-w-0 flex-1 rounded-full" onClick={() => void handleReopen()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reabrir
            </Button>
          )}
        </footer>
      </>
    );
  }
}
