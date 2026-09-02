"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { formatDuration } from "@/core/lib/format";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  CALL_PURPOSE_LABELS,
  CALL_STATUS_MAP,
  type CallSessionRowDTO,
} from "@/modules/calls/domain/call";

/**
 * Card de una llamada en curso. `now` viene del padre: UN interval para toda
 * la parrilla, no uno por card.
 */
export function LiveCallCard({ call, now }: { call: CallSessionRowDTO; now: number }) {
  const phone = call.direction === "outbound" ? call.to_number : call.from_number;
  const elapsed =
    call.started_at === null
      ? null
      : Math.max(0, Math.floor((now - new Date(call.started_at).getTime()) / 1000));

  return (
    <div className="border-border shadow-float bg-background rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <span
          className="bg-accent-violet/15 text-accent-violet flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          aria-hidden
        >
          {initials(call.contact?.name ?? null)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{call.contact?.name ?? phone}</p>
          <p className="text-muted-foreground truncate text-xs">
            {CALL_PURPOSE_LABELS[call.purpose]}
            {call.ai_agent_name !== null ? ` · ${call.ai_agent_name}` : ""}
          </p>
        </div>
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {elapsed === null ? "—" : formatDuration(elapsed)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusBadge status={call.status} map={CALL_STATUS_MAP} />
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link href={`/calls/${call.id}`}>
            <Eye className="size-4" aria-hidden />
            Ver llamada
          </Link>
        </Button>
      </div>
    </div>
  );
}

function initials(name: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}
