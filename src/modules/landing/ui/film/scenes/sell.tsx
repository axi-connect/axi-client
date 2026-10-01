import { Check, CheckCheck } from "lucide-react";
import type { ReactNode } from "react";

import type { FilmContent } from "@/modules/landing/domain/film/film-content";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { Phone } from "@/modules/landing/ui/film/parts/chat";
import { FILM_ICONS } from "@/modules/landing/ui/film/parts/film-icons";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

/* ─────────────────────────────── Chat ─────────────────────────────── */

/**
 * El guion del chat en la escena, de 0 a 1 (el `p` del lienzo «Teléfono
 * premium»): cuándo entra cada turno. El «escribiendo…» va de 0,54 a 0,62 y la
 * venta sale de la pantalla en 0,84; esos dos tiempos viven en el motor.
 */
const CHAT_AT = { customer1: 0.04, agent1: 0.16, product: 0.28, customer2: 0.42, agent2: 0.62, system: 0.76 } as const;

/** «Tecnología Medellín» → «TM». */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

function ChatMsg({ side, at, children }: { side: "in" | "out" | "system"; at: number; children: ReactNode }) {
  return (
    <div className="film-phone-msg" data-side={side} data-anim="msg" data-at={at}>
      {children}
    </div>
  );
}

function ChatText({ side, at, time, children }: { side: "in" | "out"; at: number; time: string; children: ReactNode }) {
  return (
    <ChatMsg side={side} at={at}>
      <p className="film-phone-bub">
        {children}
        <span className="film-phone-meta">
          {time}
          {side === "out" ? <CheckCheck className="size-3" aria-label="leído" /> : null}
        </span>
      </p>
    </ChatMsg>
  );
}

/** La tarjeta del producto en el chat. El teléfono se dibuja en CSS; el resto de nichos, con su icono. */
function ChatProduct({ item }: { item: FilmContent["chat"]["product"] }) {
  const Icon = FILM_ICONS[item.icon];
  return (
    <div className="film-phone-product">
      <div className="film-phone-product-art" aria-hidden="true">
        {item.icon === "smartphone" ? (
          <span className="film-phone-device">
            <span />
            <span />
          </span>
        ) : (
          <Icon className="size-11" strokeWidth={1.4} />
        )}
      </div>
      <div className="px-3 pt-[9px] pb-[11px]">
        <p className="text-[12.5px] font-semibold">{item.name}</p>
        <p className="flex justify-between gap-2 text-xs tabular-nums opacity-70">
          <span>{item.price}</span>
          <span className="truncate">{item.note}</span>
        </p>
      </div>
    </div>
  );
}

export function ChatScene() {
  return (
    <section id="vender" data-scene="chat" data-chapter="Vender" aria-labelledby="chat-h" className="film-scene">
      <div className="film-spot top-[0%] left-[0%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_12%,transparent),transparent)]" />
      <div className="film-wrap grid items-center gap-12 lg:grid-cols-2 max-lg:gap-6">
        <div className="flex justify-center max-lg:order-2">
          <Phone
            title={<ByNiche as="span">{(c) => c.business}</ByNiche>}
            initials={<ByNiche as="span">{(c) => initialsOf(c.business)}</ByNiche>}
            time={<ByNiche as="span">{(c) => c.chat.clock[2]}</ByNiche>}
            status="agente en línea"
            overlay={
              <ByNiche>
                {(c) => (
                  <div data-anim="sale" className="film-phone-sale">
                    <p className="film-eyebrow flex items-center gap-1.5 text-[10px] tracking-[0.18em] opacity-75">
                      <span className="size-1.5 rounded-full bg-[var(--axi-success)]" aria-hidden="true" />
                      {c.chat.sale.label}
                    </p>
                    <p className="film-h mt-1 text-[30px] whitespace-nowrap tabular-nums">{c.chat.sale.amount}</p>
                    <p className="text-[11.5px] opacity-65">{c.chat.sale.caption}</p>
                  </div>
                )}
              </ByNiche>
            }
          >
            <ByNiche>
              {(c) => (
                <>
                  <ChatText side="in" at={CHAT_AT.customer1} time={c.chat.clock[0]}>
                    {c.chat.customer1}
                  </ChatText>
                  <ChatText side="out" at={CHAT_AT.agent1} time={c.chat.clock[0]}>
                    {c.chat.agent1}
                  </ChatText>
                  <ChatMsg side="out" at={CHAT_AT.product}>
                    <ChatProduct item={c.chat.product} />
                  </ChatMsg>
                  <ChatText side="in" at={CHAT_AT.customer2} time={c.chat.clock[1]}>
                    {c.chat.customer2}
                  </ChatText>
                  <ChatText side="out" at={CHAT_AT.agent2} time={c.chat.clock[1]}>
                    {c.chat.agent2}
                  </ChatText>
                  <ChatMsg side="system" at={CHAT_AT.system}>
                    <span className="film-phone-system">
                      <Check className="size-3" aria-hidden="true" />
                      {c.chat.system}
                    </span>
                  </ChatMsg>
                </>
              )}
            </ByNiche>
          </Phone>
        </div>
        <div className="max-lg:order-1">
          <SceneHead
            id="chat-h"
            eyebrow="Vender"
            strong="Responde en segundos."
            thin="Con tus precios reales."
            lead={
              <span className="max-sm:hidden">
                Busca en tu catálogo, cotiza, arma el pedido y comparte tus medios de pago. Como tu mejor vendedor, a cualquier hora.
              </span>
            }
          />
          <p className="mt-7 max-lg:hidden">
            <span className="film-chip">
              <span className="size-[7px] rounded-full bg-[var(--axi-brand)]" aria-hidden="true" />
              Respondió en 4 s
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
