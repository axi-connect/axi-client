import { Sparkles, UserRound } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { OrderActorType } from "@/modules/orders/domain/order";

/** Origen del pedido: IA en violeta (único acento secundario de la vista). */
export function OrderOriginBadge({
  origin,
  className,
}: {
  origin: OrderActorType;
  className?: string;
}) {
  const byAi = origin === "ai_agent";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        byAi ? "bg-accent-violet/12 text-accent-violet" : "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {byAi ? <Sparkles aria-hidden className="size-3" /> : <UserRound aria-hidden className="size-3" />}
      {byAi ? "IA" : "Operador"}
    </span>
  );
}
