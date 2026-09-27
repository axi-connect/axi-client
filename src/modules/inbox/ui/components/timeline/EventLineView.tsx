import { CheckCheck, Sparkles } from "lucide-react"
import { cn } from "@/core/lib/utils"
import type { EventLine } from "@/modules/inbox/domain/conversation-events"
import { MessageTime } from "./MessageTime"

/**
 * Un evento de handoff en el hilo (F2): una línea centrada y sin burbuja con su
 * punto o icono y la hora. Lo que hizo Axi lleva el destello violeta; el SLA,
 * el punto ámbar; lo tuyo, tinta; el cierre, el doble check. Una nota para Axi
 * cuelga debajo con borde punteado y «solo la ve el agente».
 */
const DOT: Partial<Record<EventLine["tone"], string>> = {
  self: "bg-foreground",
  team: "bg-muted-foreground",
  warning: "bg-warning",
}

export function EventLineView({ line }: { line: EventLine }) {
  const dot = DOT[line.tone]
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <p className="flex max-w-[80%] items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">
        <span aria-hidden className="grid h-5 shrink-0 place-items-center">
          {line.tone === "ai" && <Sparkles className="size-3 text-accent-violet" />}
          {line.tone === "done" && <CheckCheck className="size-3" />}
          {dot !== undefined && <span className={cn("size-1.5 rounded-full", dot)} />}
        </span>
        <span>
          {line.text} · <MessageTime iso={line.at} />
        </span>
      </p>
      {line.note !== undefined && (
        <div className="max-w-[70%] rounded-2xl border border-dashed border-border bg-card px-3.5 py-2.5 text-xs leading-relaxed text-foreground/85">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles aria-hidden className="size-3 text-accent-violet" />
            Nota para Axi · solo la lee el agente
          </p>
          <p className="break-words whitespace-pre-wrap">{line.note}</p>
        </div>
      )}
    </div>
  )
}
