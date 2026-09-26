"use client";

import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, EllipsisVertical, Eye, Pause, Sparkles, XCircle } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { fade, spring } from "@/core/styles/motion";
import type { DealDTO } from "@/modules/crm/domain/deal";
import { daysInStage } from "@/modules/crm/domain/deal-state";
import { daysLabel, formatCloseDate, stallInfo } from "@/modules/crm/domain/pipeline-summary";
import { StatePill } from "@/shared/components/features/bento";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export type DealCardAction = { type: "view" } | { type: "win" } | { type: "lose" };

type DealCardProps = {
  deal: DealDTO;
  /** `rotting_days` de la etapa (del board): deriva «N días quieta · aguanta M». */
  rottingDays: number | null;
  highlighted: boolean;
  /** La oportunidad abierta en el detalle: anillo de tinta, como la selección de Cobros. */
  selected?: boolean;
  canOperate: boolean;
  dragDisabled?: boolean;
  onAction: (deal: DealDTO, action: DealCardAction) => void;
};

/**
 * Tarjeta del tablero (lienzo CRM premium F1). Cuatro líneas, cada una un
 * dato: el título, el contacto, el monto con su cierre y el estado. El estado
 * va en una `StatePill` —el color en el punto, el texto en foreground— y el
 * violeta solo en el icono de lo que abrió Axi.
 *
 * El menú ⋮ es la alternativa accesible/táctil al drag y el único camino a
 * Ganada/Perdida desde el tablero; aparece al pasar o con el foco, y en táctil
 * siempre (no hay hover).
 */
function DealCardBase({ deal, rottingDays, highlighted, selected = false, canOperate, dragDisabled, onAction }: DealCardProps) {
  const reducedMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { stage_id: deal.stage_id },
    disabled: dragDisabled || !canOperate,
  });

  const stall = stallInfo(deal, rottingDays);
  const byAi = deal.source === "ai_conversation";
  const contactName = deal.contact.full_name ?? deal.contact.phone ?? "Sin contacto";
  const amount = deal.value_cents !== null ? formatMoney(deal.value_cents, deal.currency) : null;
  const close = deal.expected_close_date !== null ? formatCloseDate(deal.expected_close_date) : "";

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
        aria-label={`${deal.title}, ${contactName}${amount !== null ? `, ${amount}` : ""}`}
        data-deal-id={deal.id}
        className={cn(
          "group flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 shadow-xs transition-shadow outline-none hover:shadow-float focus-visible:ring-[3px] focus-visible:ring-ring/50",
          canOperate && !dragDisabled && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40",
          selected && "ring-2 ring-foreground",
          highlighted && !selected && "ring-2 ring-ring",
        )}
        onClick={() => onAction(deal, { type: "view" })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAction(deal, { type: "view" });
        }}
      >
        <div className="flex min-w-0 items-start gap-1.5">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={deal.title}>
            {deal.title}
          </p>
          {byAi && (
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-violet" role="img" aria-label="La abrió Axi" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Acciones de ${deal.title}`}
                className="-my-1 -mr-1.5 size-6 shrink-0 rounded-full opacity-100 transition-opacity focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
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
                  <DropdownMenuItem className="text-destructive hover:text-destructive" onClick={() => onAction(deal, { type: "lose" })}>
                    <span className="flex items-center gap-2"><XCircle className="size-4" /> Marcar perdida</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Avatar src={deal.contact.avatar_url} alt="" fallback={contactName} size={22} />
          <p className="min-w-0 truncate text-[13px] text-muted-foreground" title={contactName}>
            {contactName}
          </p>
        </div>

        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <p
            className={cn(
              "min-w-0 truncate font-heading font-bold tabular-nums",
              amount !== null ? "text-[17px] tracking-tight" : "text-sm font-medium text-muted-foreground",
            )}
            title={amount ?? undefined}
          >
            {amount ?? "Sin valor"}
          </p>
          {close !== "" && <span className="shrink-0 text-[11.5px] whitespace-nowrap text-muted-foreground">cierra {close}</span>}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {stall !== null ? (
            <StatePill tone="warning">
              {daysLabel(stall.days)} quieta · aguanta {stall.limit}
            </StatePill>
          ) : deal.ai_moves_paused ? (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap">
              <Pause className="size-3" aria-hidden="true" />
              Axi no la mueve
            </span>
          ) : (
            <span className="text-[11.5px] whitespace-nowrap text-muted-foreground">
              {daysInStage(deal.stage_entered_at) === 0 ? "Entró hoy a la etapa" : `${daysLabel(daysInStage(deal.stage_entered_at))} en la etapa`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export const DealCard = memo(DealCardBase);
