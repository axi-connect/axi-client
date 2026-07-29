"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  ListChecks,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { relativeTime } from "@/core/lib/relative-time";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  TIMELINE_SOURCE_LABELS,
  TIMELINE_SOURCES,
  type TimelineEntryDTO,
  type TimelineSource,
} from "@/modules/crm/domain/contact";
import { getContactTimeline } from "@/modules/crm/infrastructure/services/contacts-service.adapter";

const PAGE_LIMIT = 30;

const SOURCE_VISUAL: Record<
  TimelineSource,
  { icon: React.ComponentType<{ className?: string }>; badge: string }
> = {
  activities: { icon: ListChecks, badge: "bg-secondary text-secondary-foreground" },
  deals: { icon: Target, badge: "bg-info/12 text-info" },
  orders: { icon: ShoppingCart, badge: "bg-success/12 text-success" },
  conversations: { icon: MessageCircle, badge: "bg-secondary text-secondary-foreground" },
  appointments: { icon: Calendar, badge: "bg-warning/12 text-warning" },
};

function entryTitle(entry: TimelineEntryDTO): string {
  return entry.title?.trim() || `${TIMELINE_SOURCE_LABELS[entry.source]}: ${entry.type}`;
}

function isAiEntry(entry: TimelineEntryDTO): boolean {
  const byType = entry.payload?.created_by_type ?? entry.payload?.actor_type;
  return byType === "ai_agent";
}

/**
 * Timeline 360 multi-fuente (`/crm/contacts/:id/timeline`, D4): chips toggle
 * de fuentes (re-consulta desde cero) + "Cargar más" con cursor opaco.
 * Visual patrón OrderTimeline: lista con línea vertical y badges tonales.
 */
export function ContactTimeline({ contactId }: { contactId: string }) {
  const [enabled, setEnabled] = useState<TimelineSource[]>([...TIMELINE_SOURCES]);
  const [entries, setEntries] = useState<TimelineEntryDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guard anti-race: solo aplica la respuesta de la última consulta lanzada.
  const requestSeq = useRef(0);

  const load = useCallback(
    async (sources: TimelineSource[], nextCursor?: string) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const page = await getContactTimeline(contactId, {
          sources,
          cursor: nextCursor,
          limit: PAGE_LIMIT,
        });
        if (seq !== requestSeq.current) return;
        setEntries((prev) => (nextCursor ? [...prev, ...page.data] : page.data));
        setCursor(page.next_cursor ?? null);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(errorMessage(err, "No se pudo cargar el historial"));
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [contactId],
  );

  useEffect(() => {
    void load(enabled);
  }, [enabled, load]);

  const toggleSource = (source: TimelineSource) => {
    setEntries([]);
    setCursor(null);
    setEnabled((prev) =>
      prev.includes(source)
        ? prev.length > 1
          ? prev.filter((item) => item !== source)
          : prev // siempre queda al menos una fuente activa
        : [...prev, source],
    );
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Historial</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Fuentes del historial">
          {TIMELINE_SOURCES.map((source) => {
            const active = enabled.includes(source);
            return (
              <button
                key={source}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSource(source)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary/40 bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {TIMELINE_SOURCE_LABELS[source]}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={() => void load(enabled)}
          >
            Reintentar
          </Button>
        </div>
      ) : entries.length === 0 && !loading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sin eventos para las fuentes seleccionadas.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {entries.map((entry) => {
            const visual = SOURCE_VISUAL[entry.source];
            const Icon = visual.icon;
            return (
              <li key={`${entry.source}-${entry.id}`} className="relative flex gap-3 pb-5 last:pb-0">
                <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-border last:hidden" aria-hidden />
                <span
                  className={cn(
                    "z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                    visual.badge,
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-medium">{entryTitle(entry)}</p>
                    {isAiEntry(entry) && (
                      <Badge variant="outline" className="gap-1 border-accent-violet/40 text-accent-violet">
                        <Sparkles className="size-3" aria-hidden />
                        IA
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {TIMELINE_SOURCE_LABELS[entry.source]} · {relativeTime(entry.occurred_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {loading && (
        <div className="mt-4 space-y-2" role="status" aria-label="Cargando historial">
          <div className="h-7 animate-pulse rounded-lg bg-muted" />
          <div className="h-7 animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {cursor && !loading && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void load(enabled, cursor)}
          >
            Cargar más
          </Button>
        </div>
      )}
    </section>
  );
}
