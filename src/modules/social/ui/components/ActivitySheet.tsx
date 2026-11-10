"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/core/lib/relative-time";
import { errorMessage } from "@/core/lib/error-messages";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { EmptyState } from "@/shared/components/features/empty-state";
import { StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { LoadError } from "@/modules/marketing/ui/components/premium";
import {
  commenterLabel,
  describeActivity,
  type ActivityItemDTO,
  type SocialAutomationDTO,
} from "@/modules/social/domain/social";
import { listSocialActivity } from "@/modules/social/infrastructure/services/social-service.adapter";
import { FunnelStrip } from "./FunnelStrip";
import { NetworkIcon } from "./SocialPieces";

/**
 * El detalle de una automatización: su embudo y lo que pasó con CADA
 * comentario, con el motivo cuando no recibió nada. Más nuevos primero, de a
 * 30, con «Ver más» (cursor del servidor).
 */
export function ActivitySheet({
  automation,
  onOpenChange,
}: {
  automation: SocialAutomationDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [items, setItems] = useState<ActivityItemDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const automationId = automation?.id ?? null;

  const load = useCallback(
    async (after: string | null) => {
      if (automationId === null) return;
      setLoading(true);
      try {
        const page = await listSocialActivity(automationId, after === null ? {} : { cursor: after });
        setItems((prev) => (after === null || prev === null ? page.data : [...prev, ...page.data]));
        setCursor(page.next_cursor);
        setError(null);
      } catch (err) {
        setError(errorMessage(err, "No pudimos cargar la actividad"));
      } finally {
        setLoading(false);
      }
    },
    [automationId],
  );

  useEffect(() => {
    setItems(null);
    setCursor(null);
    if (automationId !== null) void load(null);
  }, [automationId, load]);

  return (
    <DetailSheet
      open={automation !== null}
      onOpenChange={onOpenChange}
      size="lg"
      title={automation?.name ?? "Actividad"}
      subtitle="Lo que pasó con cada comentario"
    >
      {automation !== null && (
        <div className="@container flex min-w-0 flex-col gap-5">
          <FunnelStrip funnel={automation.funnel} />
          {error !== null ? (
            <LoadError message={error} onRetry={() => void load(null)} />
          ) : items === null ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              glyph="conversation"
              title="Todavía nadie comenta"
              description="Cuando alguien comente en la publicación, aquí verás si recibió la entrega o por qué no."
            />
          ) : (
            <ul className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
              {items.map((item) => {
                const state = describeActivity(item);
                return (
                  <li key={item.id} className="flex min-w-0 gap-3 px-4 py-3">
                    <NetworkIcon network={item.network} className="mt-0.5 size-4 shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
                        <b className="truncate font-semibold">
                          {commenterLabel(item)}
                        </b>
                        <span className="text-muted-foreground text-xs">
                          {relativeTime(item.commented_at ?? item.created_at)}
                        </span>
                      </p>
                      <p className="line-clamp-2 text-sm text-pretty">{item.comment_text}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatePill tone={state.tone}>{state.label}</StatePill>
                        {item.conversation_id !== null && (
                          <Link
                            href={`/workspace/inbox/${item.conversation_id}`}
                            className="text-sm font-medium underline-offset-4 hover:underline"
                          >
                            Ver la conversación
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {cursor !== null && items !== null && (
            <Button
              variant="outline"
              className="self-center rounded-full"
              disabled={loading}
              onClick={() => void load(cursor)}
            >
              Ver más
            </Button>
          )}
        </div>
      )}
    </DetailSheet>
  );
}
