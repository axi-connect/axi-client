"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  EllipsisVertical,
  Eye,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { fade, spring } from "@/core/styles/motion";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { DealDTO } from "@/modules/crm/domain/deal";
import { daysInStage, isStalled } from "@/modules/crm/domain/deal-state";

export type DealCardAction = { type: "view" } | { type: "win" } | { type: "lose" };

type DealCardProps = {
  deal: DealDTO;
  /** `rotting_days` de la etapa (del board): deriva el ⚠ de estancamiento. */
  rottingDays: number | null;
  highlighted: boolean;
  canOperate: boolean;
  dragDisabled?: boolean;
  onAction: (deal: DealDTO, action: DealCardAction) => void;
};

/**
 * Tarjeta del board. El menú ⋮ es la alternativa accesible/táctil al drag y
 * el único camino a Ganado/Perdido (nunca columnas fantasma). El ⚠ de
 * estancamiento se deriva en cliente (stage_entered_at + rotting_days).
 */
function DealCardBase({
  deal,
  rottingDays,
  highlighted,
  canOperate,
  dragDisabled,
  onAction,
}: DealCardProps) {
  const reducedMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { stage_id: deal.stage_id },
    disabled: dragDisabled || !canOperate,
  });

  const stalled = isStalled(deal, rottingDays);
  const byAi = deal.source === "ai_conversation";
  const contactName = deal.contact.full_name ?? deal.contact.phone ?? "Sin contacto";

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : spring.snappy}
      exit={reducedMotion ? undefined : fade.fast}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        data-deal-id={deal.id}
        className={cn(
          "group rounded-2xl border border-border bg-background p-3.5 transition-shadow",
          canOperate && !dragDisabled && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40",
          highlighted && "ring-2 ring-ring",
        )}
        onClick={() => onAction(deal, { type: "view" })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAction(deal, { type: "view" });
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{deal.title}</p>
          <div className="flex items-center gap-1">
            {byAi && (
              <Badge variant="outline" className="gap-1 border-accent-violet/40 px-1.5 text-accent-violet">
                <Sparkles className="size-3" aria-hidden />
                IA
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Acciones de ${deal.title}`}
                  className="size-6 opacity-60 hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <EllipsisVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction(deal, { type: "view" })}>
                  <span className="flex items-center gap-2"><Eye className="size-4" /> Ver detalle</span>
                </DropdownMenuItem>
                {canOperate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onAction(deal, { type: "win" })}>
                      <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Marcar ganada</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive hover:text-destructive"
                      onClick={() => onAction(deal, { type: "lose" })}
                    >
                      <span className="flex items-center gap-2"><XCircle className="size-4" /> Marcar perdida</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {stalled && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning">
            <TriangleAlert className="size-3.5" aria-hidden />
            {daysInStage(deal.stage_entered_at)} días sin moverse
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <Avatar
            src={deal.contact.avatar_url}
            alt={contactName}
            fallback={contactName}
            size={24}
          />
          <p className="min-w-0 truncate text-sm text-muted-foreground">{contactName}</p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-base font-semibold tabular-nums">
            {deal.value_cents !== null ? formatMoney(deal.value_cents, deal.currency) : "—"}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {relativeTime(deal.stage_entered_at)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export const DealCard = memo(DealCardBase);
