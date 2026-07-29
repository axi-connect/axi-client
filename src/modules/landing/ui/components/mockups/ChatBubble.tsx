import { cn } from "@/core/lib/utils";
import type { ChatMessage } from "@/modules/landing/ui/content/landing.content";

/**
 * Burbuja del mockup de conversación (estilo WhatsApp, con tokens de marca):
 * cliente a la izquierda (neutra), agente a la derecha (tinte coral),
 * "product" como mini-tarjeta con foto de catálogo y "system" como píldora
 * centrada en Geist Mono.
 */
export function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.kind === "system") {
    return (
      <div className="bg-secondary text-muted-foreground self-center rounded-full px-3 py-1.5 font-mono text-[10.5px]">
        {message.text}
      </div>
    );
  }

  if (message.kind === "product") {
    return (
      <div className="border-border bg-card self-end overflow-hidden rounded-2xl rounded-br-md border shadow-float max-w-[86%]">
        <div className="border-border/60 text-muted-foreground flex aspect-[5/3] w-44 items-center justify-center border-b border-dashed text-center text-[11px] leading-snug">
          {message.placeholder}
        </div>
        <p className="px-3 py-2 font-mono text-[11px]">{message.caption}</p>
      </div>
    );
  }

  const isCustomer = message.from === "customer";
  return (
    <div
      className={cn(
        "max-w-[86%] px-3.5 py-2.5 text-[13.5px] leading-relaxed",
        isCustomer
          ? "bg-secondary text-foreground self-start rounded-2xl rounded-bl-md"
          : "bg-brand/12 border-brand/25 text-foreground self-end rounded-2xl rounded-br-md border",
      )}
    >
      {message.text}
    </div>
  );
}
