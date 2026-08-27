import { FaFacebookMessenger, FaInstagram, FaWhatsapp } from "react-icons/fa";

import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { MarqueeColumn } from "@/modules/landing/ui/components/MarqueeColumn";
import {
  CHAT_WALL,
  CONVERSATIONS_SECTION,
  type WallMessage,
} from "@/modules/landing/ui/content/productos.content";

const CHANNEL_ICONS = {
  whatsapp: { Icon: FaWhatsapp, className: "text-logo-whatsapp" },
  instagram: { Icon: FaInstagram, className: "text-logo-instagram" },
  messenger: { Icon: FaFacebookMessenger, className: "text-logo-messenger" },
} as const;

/** Velocidades distintas por columna: la diferencia de ritmo da profundidad. */
const COLUMN_SPEEDS = ["46s", "58s", "52s"] as const;

/**
 * §7 — el muro 3D de conversaciones (pre-CTA): tres columnas de mensajes en
 * marquee vertical CSS (compositor, cero JS), inclinadas en perspectiva.
 * Sustituye a la sección de medición, que duplicaba la §6 de la home — el
 * ancla `#medicion` del mega-menú apunta ahora a `/#medicion`.
 *
 * Los negocios son ficticios (retail, comida, moda); el mensaje del agente se
 * distingue por el borde coral + la marca «α · Agente» (violeta = IA, la
 * convención transversal). Hover pausa el muro (`group/wall`); reduced-motion
 * lo deja quieto.
 */
export default function ProductosConversaciones() {
  return (
    <section
      aria-label="Conversaciones de ejemplo con el agente"
      className="w-full overflow-x-clip"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-24">
        <SectionHeading
          align="center"
          kicker={CONVERSATIONS_SECTION.kicker}
          title={CONVERSATIONS_SECTION.title}
          intro={CONVERSATIONS_SECTION.intro}
        />

        <div className="group/wall relative mt-12 h-[520px] overflow-hidden [perspective:420px]">
          <div
            className="flex h-full justify-center gap-4"
            style={{
              transform:
                "translateZ(-60px) rotateX(14deg) rotateY(-9deg) rotateZ(9deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {CHAT_WALL.map((column, i) => (
              <MarqueeColumn
                key={COLUMN_SPEEDS[i]}
                reverse={i % 2 === 1}
                duration={COLUMN_SPEEDS[i]}
                className={cn("w-[248px] shrink-0", i === 2 && "max-md:hidden")}
              >
                {column.map((message) => (
                  <ConversationCard key={message.id} message={message} />
                ))}
              </MarqueeColumn>
            ))}
          </div>

          {/* Fundidos de borde: el muro emerge del fondo de la página. */}
          <div aria-hidden className="from-background pointer-events-none absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b" />
          <div aria-hidden className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t" />
          <div aria-hidden className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r" />
          <div aria-hidden className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l" />
        </div>
      </div>
    </section>
  );
}

function ConversationCard({ message }: { message: WallMessage }) {
  const channel = CHANNEL_ICONS[message.channel];
  const isAgent = message.from === "agent";

  return (
    <figure
      className={cn(
        "bg-card w-full rounded-2xl border p-4 shadow-float",
        isAgent ? "border-brand/25" : "border-border",
      )}
    >
      <figcaption className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="font-heading bg-secondary text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        >
          {message.business.charAt(0)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
          {message.business}
        </span>
        <channel.Icon aria-hidden className={cn("size-4 shrink-0", channel.className)} />
      </figcaption>
      <blockquote className="mt-2.5 text-[12.5px] leading-relaxed text-pretty">
        {message.text}
      </blockquote>
      {isAgent ? (
        <p className="text-accent-violet mt-2.5 flex items-center gap-1.5 text-[10.5px] font-medium">
          <BrandMark className="size-3.5" />
          Agente · IA
        </p>
      ) : (
        <p className="text-muted-foreground mt-2.5 text-[10.5px]">Cliente</p>
      )}
    </figure>
  );
}
