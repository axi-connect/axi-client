"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate, parseMoneyToCents } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  DEAL_EVENT_LABELS,
  DEAL_STATUS_LABELS,
  type DealDTO,
  type DealEventDTO,
  type DealStatus,
} from "@/modules/crm/domain/deal";
import { canTransition } from "@/modules/crm/domain/deal-state";
import { listAssignableUsers } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import {
  getDeal,
  getDealEvents,
  updateDeal,
} from "@/modules/crm/infrastructure/services/deals-service.adapter";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
import { WinLoseDialog, type WinLoseRequest } from "@/modules/crm/ui/components/kanban/WinLoseDialog";

const NO_OWNER = "__none__";

const STATUS_BADGE_CLASSES: Record<DealStatus, string> = {
  open: "border-transparent bg-info/12 text-info",
  won: "border-transparent bg-success/12 text-success",
  lost: "border-transparent bg-destructive/12 text-destructive",
};

const EVENT_TONE: Partial<Record<DealEventDTO["type"], string>> = {
  won: "bg-success/12 text-success",
  lost: "bg-destructive/12 text-destructive",
  stalled: "bg-warning/12 text-warning",
};

/**
 * Rail derecho del deal (patrón OrderDetailRail): datos con PATCH inline
 * (valor/fecha = edición humana; owner gate crm:manage), contacto → 360,
 * conversación de origen, acciones win/lose/reopen y el historial de eventos.
 * Escucha `crm:deal:detail:refresh` (lo emite el board.store ante eventos WS).
 */
export function DealDetailRail({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("crm:manage");
  const transition = useBoardStore((s) => s.transition);
  const refreshBoardDeal = useBoardStore((s) => s.refreshDeal);

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
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo cargar la oportunidad"),
        open: true,
      });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  useEffect(() => {
    void load();
    listAssignableUsers()
      .then((all) => setUsers(all.filter((user) => user.status === "active")))
      .catch(() => setUsers([]));
    const onRefresh = (e: Event) => {
      if ((e as CustomEvent).detail?.deal_id === dealId) void load();
    };
    window.addEventListener("crm:deal:detail:refresh", onRefresh);
    return () => window.removeEventListener("crm:deal:detail:refresh", onRefresh);
  }, [dealId, load]);

  const patch = async (dto: Parameters<typeof updateDeal>[1], successTitle: string) => {
    try {
      const fresh = await updateDeal(dealId, dto);
      setDeal(fresh);
      void refreshBoardDeal(dealId);
      showAlert({ tone: "success", title: successTitle, open: true });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar"), open: true });
    }
  };

  const handleTransition = async (action: "reopen") => {
    const result = await transition(dealId, action);
    if (result.ok) {
      showAlert({ tone: "success", title: "Oportunidad reabierta", open: true });
      void load();
    } else {
      showAlert({ tone: "error", title: result.message, open: true });
    }
  };

  const contactName = deal?.contact.full_name ?? deal?.contact.phone ?? "Sin contacto";

  return (
    <aside
      aria-label="Detalle de la oportunidad"
      className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background lg:w-[380px] lg:shrink-0 lg:rounded-2xl lg:border"
    >
      {deal === null ? (
        <div className="flex flex-1 items-center justify-center" role="status" aria-label="Cargando">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <header className="flex items-start justify-between gap-2 border-b border-border p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-base font-semibold">{deal.title}</h2>
                {deal.source === "ai_conversation" && (
                  <Badge variant="outline" className="gap-1 border-accent-violet/40 text-accent-violet">
                    <Sparkles className="size-3" aria-hidden /> IA
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {deal.stage.name} ({deal.stage.probability_pct}%)
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn(STATUS_BADGE_CLASSES[deal.status])}>
                {DEAL_STATUS_LABELS[deal.status]}
              </Badge>
              <Button variant="ghost" size="icon" aria-label="Cerrar detalle" onClick={onClose}>
                <XIcon className="size-4" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {/* Datos editables */}
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Valor</dt>
                {editingValue ? (
                  <form
                    className="flex items-center gap-1"
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
                      className="h-8 w-28 text-right tabular-nums"
                      aria-label="Nuevo valor"
                    />
                    <Button type="submit" variant="ghost" size="icon" className="size-7" aria-label="Guardar valor">
                      <Check className="size-3.5" />
                    </Button>
                  </form>
                ) : (
                  <dd className="flex items-center gap-1 font-medium tabular-nums">
                    {deal.value_cents !== null ? formatMoney(deal.value_cents, deal.currency) : "—"}
                    {deal.status === "open" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-60 hover:opacity-100"
                        aria-label="Editar valor"
                        onClick={() => {
                          setValueDraft(deal.value_cents !== null ? String(deal.value_cents / 100) : "");
                          setEditingValue(true);
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                    )}
                  </dd>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Cierre esperado</dt>
                <dd>
                  {deal.status === "open" ? (
                    <input
                      type="date"
                      value={deal.expected_close_date?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        void patch(
                          { expected_close_date: e.target.value || undefined },
                          "Fecha actualizada",
                        )
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      aria-label="Fecha de cierre esperada"
                    />
                  ) : deal.expected_close_date !== null ? (
                    formatShortDate(deal.expected_close_date)
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Dueño</dt>
                <dd>
                  <Select
                    value={deal.owner_user_id ?? NO_OWNER}
                    onValueChange={(value: string) =>
                      void patch(
                        { owner_user_id: value === NO_OWNER ? undefined : value },
                        "Dueño actualizado",
                      )
                    }
                    disabled={!canManage || deal.status !== "open"}
                  >
                    <SelectTrigger className="h-8 w-40" aria-label="Dueño de la oportunidad">
                      <SelectValue placeholder="Sin dueño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_OWNER}>Sin dueño</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Contacto</dt>
                <dd>
                  <Link
                    href={`/crm/contacts/${deal.contact_id}`}
                    className="flex items-center gap-2 font-medium transition-colors hover:text-brand"
                  >
                    <Avatar src={deal.contact.avatar_url} alt={contactName} fallback={contactName} size={22} />
                    <span className="max-w-40 truncate">{contactName}</span>
                  </Link>
                </dd>
              </div>

              {deal.conversation_id !== null && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Origen</dt>
                  <dd>
                    <Link
                      href={`/workspace/inbox/${deal.conversation_id}`}
                      className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-brand"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Ver conversación
                    </Link>
                  </dd>
                </div>
              )}
            </dl>

            {/* Acciones de estado */}
            <div className="flex gap-2">
              {canTransition(deal.status, "won") && (
                <Button
                  className="flex-1 rounded-full"
                  onClick={() => setWinLose({ deal, action: "win" })}
                >
                  <CheckCircle2 className="size-4" />
                  Ganada
                </Button>
              )}
              {canTransition(deal.status, "lost") && (
                <Button
                  variant="destructive"
                  className="flex-1 rounded-full"
                  onClick={() => setWinLose({ deal, action: "lose" })}
                >
                  <XCircle className="size-4" />
                  Perdida
                </Button>
              )}
              {canTransition(deal.status, "open") && (
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => void handleTransition("reopen")}
                >
                  <RotateCcw className="size-4" />
                  Reabrir
                </Button>
              )}
            </div>

            {deal.status === "open" && (
              <Button asChild variant="outline" size="sm" className="w-full rounded-full">
                <Link
                  href={`/crm/tasks/create?contact_id=${deal.contact_id}&contact_label=${encodeURIComponent(contactName)}&deal_id=${deal.id}`}
                >
                  <CalendarPlus className="size-4" />
                  Agendar seguimiento
                </Link>
              </Button>
            )}

            {/* Historial */}
            <section>
              <h3 className="text-sm font-semibold">Historial</h3>
              <ol className="mt-2 space-y-0">
                {[...events].reverse().map((event) => (
                  <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <span
                      className={cn(
                        "z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        EVENT_TONE[event.type] ?? "bg-secondary text-secondary-foreground",
                      )}
                      aria-hidden
                    >
                      ●
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{DEAL_EVENT_LABELS[event.type]}</span>
                        {event.actor_type === "ai_agent" && (
                          <span className="ml-1.5 text-xs text-accent-violet">✦ IA</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor_name ?? (event.actor_type === "system" ? "Sistema" : "")}{" "}
                        · {relativeTime(event.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin eventos todavía.</p>
                )}
              </ol>
            </section>

            {/* Notas */}
            <section>
              <h3 className="text-sm font-semibold">Notas</h3>
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                placeholder="Notas internas de la oportunidad…"
                className="mt-2"
                disabled={deal.status !== "open"}
              />
              {deal.status === "open" && notesDraft !== (deal.notes ?? "") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 rounded-full"
                  onClick={() => void patch({ notes: notesDraft }, "Notas guardadas")}
                >
                  Guardar notas
                </Button>
              )}
            </section>
          </div>
        </>
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
}
