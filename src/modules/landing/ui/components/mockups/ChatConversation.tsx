"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { spring } from "@/core/styles/motion";
import { ChatBubble } from "@/modules/landing/ui/components/mockups/ChatBubble";
import { MASCOTS, type ChatMessage } from "@/modules/landing/ui/content/landing.content";

/**
 * Ventana de conversación del producto (hero y §4).
 *
 * - `autoplay`: las burbujas entran escalonadas al descubrir el mockup
 *   (una sola vez, física de marca).
 * - `controlled`: el padre decide cuántos mensajes se ven (`visibleUpTo`,
 *   1-indexado) — lo usa el timeline de §4 para avanzar el chat por paso.
 *
 * Con reduced-motion todo se muestra estático.
 */
export function ChatConversation({
  businessName,
  status,
  messages,
  mode = "autoplay",
  visibleUpTo,
  className,
}: {
  businessName: string;
  status: string;
  messages: ReadonlyArray<ChatMessage>;
  mode?: "autoplay" | "controlled";
  visibleUpTo?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const animated = mode === "autoplay" && !reduced;
  const visible =
    mode === "controlled" && visibleUpTo !== undefined
      ? messages.slice(0, Math.max(0, visibleUpTo))
      : messages;

  return (
    <div
      className={cn(
        "border-border bg-card rounded-[26px] border p-4 pb-5 shadow-overlay",
        className,
      )}
    >
      {/* Cabecera del chat: avatar Nova + negocio + estado */}
      <div className="border-border/70 flex items-center gap-2.5 border-b px-1.5 pt-1 pb-3.5">
        <Image
          src={MASCOTS.novaCloseup.src}
          alt={MASCOTS.novaCloseup.alt}
          width={38}
          height={38}
          className="bg-accent-violet/15 size-[38px] rounded-full object-cover object-top"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{businessName}</span>
          <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]">
            <span aria-hidden className="bg-success inline-block size-1.5 rounded-full" />
            {status}
          </span>
        </div>
      </div>

      {/* Hilo */}
      <div className="flex min-h-[240px] flex-col gap-2.5 pt-4">
        {visible.map((message, i) =>
          animated ? (
            <motion.div
              key={message.id}
              className="flex flex-col"
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ ...spring.soft, delay: 0.35 + i * 0.45 }}
            >
              <ChatBubble message={message} />
            </motion.div>
          ) : (
            <motion.div
              key={message.id}
              className="flex flex-col"
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.soft}
            >
              <ChatBubble message={message} />
            </motion.div>
          ),
        )}
      </div>
    </div>
  );
}
