import Image from "next/image";

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
      <div className="border-border bg-card w-60 max-w-[86%] self-end overflow-hidden rounded-2xl rounded-br-md border shadow-float">
        {message.imageSrc ? (
          /* La foto ocupa TODO el ancho de la tarjeta y se muestra completa
             (object-contain): nunca se recorta el producto, sea cual sea la
             proporción de la imagen. */
          <div className="border-border/60 bg-secondary/40 relative aspect-[4/3] w-full border-b">
            <Image
              src={message.imageSrc}
              alt={message.caption}
              fill
              sizes="240px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="border-border/60 text-muted-foreground flex aspect-[4/3] w-full items-center justify-center border-b border-dashed p-3 text-center text-[11px] leading-snug">
            {message.placeholder}
          </div>
        )}
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
