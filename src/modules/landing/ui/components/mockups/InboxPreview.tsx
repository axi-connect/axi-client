import Image from "next/image";

import { cn } from "@/core/lib/utils";
import { MASCOTS, TEAM_CONTROL } from "@/modules/landing/ui/content/landing.content";

const TAG_STYLES = {
  sla: "bg-warning/15 text-warning",
  ai: "bg-accent-violet/15 text-accent-violet",
  human: "bg-secondary text-muted-foreground",
} as const;

/**
 * Mockup del inbox del equipo (§7): cola de conversaciones + hilo abierto en
 * modo humano con la nota para el agente. Estático a propósito — es una
 * captura viva del producto, no una demo interactiva.
 */
export function InboxPreview({ className }: { className?: string }) {
  const { inbox } = TEAM_CONTROL;

  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-[26px] border shadow-overlay",
        className,
      )}
    >
      {/* Cabecera */}
      <div className="border-border/70 flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">{inbox.title}</span>
        <span className="bg-brand/12 text-brand rounded-full px-2.5 py-1 font-mono text-[10px] font-medium">
          {inbox.badge}
        </span>
      </div>

      <div className="grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Cola */}
        <div className="border-border/70 flex flex-col max-sm:border-b sm:border-r">
          {inbox.queue.map((item) => (
            <div
              key={item.name}
              className={cn(
                "border-border/50 flex flex-col gap-1 border-b px-4 py-3 last:border-b-0",
                item.active && "bg-accent",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">{item.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium",
                    TAG_STYLES[item.tagKind],
                  )}
                >
                  {item.tag}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{item.preview}</p>
            </div>
          ))}
        </div>

        {/* Hilo en modo humano */}
        <div className="flex flex-col justify-between gap-4 p-4">
          <div className="flex flex-col gap-2.5">
            <div className="bg-secondary max-w-[86%] self-start rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13px] leading-relaxed">
              {inbox.thread.customerMessage}
            </div>
            <div className="bg-secondary text-muted-foreground flex items-center gap-2 self-center rounded-full px-3 py-1.5 font-mono text-[10.5px]">
              <Image
                src={MASCOTS.novaCloseup.src}
                alt=""
                width={18}
                height={18}
                className="size-[18px] rounded-full object-cover object-top"
              />
              {inbox.thread.systemPill}
            </div>
            <div className="bg-brand/12 border-brand/25 max-w-[86%] self-end rounded-2xl rounded-br-md border px-3.5 py-2.5 text-[13px] leading-relaxed">
              {inbox.thread.agentReply}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="bg-accent-amber/10 border-accent-amber/30 rounded-xl border px-3 py-2 text-xs">
              {inbox.thread.noteLead}
              <span className="font-medium">{inbox.thread.note}</span>
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="border-input text-muted-foreground flex-1 rounded-xl border px-3 py-2 text-xs">
                {inbox.thread.inputPlaceholder}
              </span>
              <span className="bg-secondary rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap">
                {inbox.thread.returnAction}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
