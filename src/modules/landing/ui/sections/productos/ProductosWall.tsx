import "./wall.css";

import { WALL, type WallMessage } from "@/modules/landing/ui/content/productos.content";
import { MarqueeColumn } from "@/modules/landing/ui/components/MarqueeColumn";
import { BrandMark } from "@/shared/components/ui/brand-mark";

/** Velocidades distintas por columna: la diferencia de ritmo da profundidad. */
const SPEEDS = ["46s", "58s", "52s"] as const;

/**
 * #conversaciones — «Así suena un negocio con Axi», el muro del /productos
 * original recuperado entre el video y el cierre (pedido de la dueña). Tres
 * columnas en marquee CSS (compositor, cero JS: es RSC) inclinadas en
 * perspectiva; el hover pausa y movimiento reducido lo deja quieto.
 *
 * Negocios y mensajes de ejemplo, solo WhatsApp (ver `WALL` en el contenido).
 * El mensaje del agente va en tinta invertida, como en el chat del juego.
 */
export function ProductosWall() {
  return (
    <section id={WALL.anchor} aria-labelledby="muro-title" className="pj-scene pj-wall justify-center gap-10">
      <div className="pj-glow" aria-hidden="true" />
      <div className="relative z-[1] flex flex-col items-center gap-3 text-center">
        <p className="pj-eyebrow text-[var(--axi-brand)]">{WALL.eyebrow}</p>
        <h2 id="muro-title" className="pj-h pj-h-lg">
          {WALL.strong} <span className="t">{WALL.thin}</span>
        </h2>
        <p className="pj-lead max-w-[46ch] text-pretty">{WALL.lead}</p>
        <span className="pj-wall-sample">{WALL.sample}</span>
      </div>

      <div className="pj-wall-stage group/wall" role="group" aria-label={WALL.label}>
        <div className="pj-wall-tilt">
          {WALL.columns.map((column, i) => (
            <MarqueeColumn key={SPEEDS[i]} reverse={i % 2 === 1} duration={SPEEDS[i]} className={i === 2 ? "pj-wall-col pj-wall-col-last" : "pj-wall-col"}>
              {/* Dos pasadas por copia: la columna es más alta que el plano inclinado y nunca se le ve el final. */}
              {[...column, ...column].map((message, k) => (
                <WallCard key={`${message.id}-${k}`} message={message} repeat={k >= column.length} />
              ))}
            </MarqueeColumn>
          ))}
        </div>
      </div>
    </section>
  );
}

function WallCard({ message, repeat }: { message: WallMessage; repeat: boolean }) {
  const agent = message.from === "agent";
  return (
    <figure className="pj-wall-card" data-from={message.from} aria-hidden={repeat || undefined}>
      <figcaption className="pj-wall-who">
        <span className="pj-wall-av" aria-hidden="true">
          {message.business.charAt(0)}
        </span>
        <span className="pj-wall-biz">{message.business}</span>
        <span className="pj-wall-ch">{WALL.channel}</span>
      </figcaption>
      <blockquote className="pj-wall-text">{message.text}</blockquote>
      <p className="pj-wall-by">
        {agent ? <BrandMark className="size-3.5" /> : null}
        {agent ? WALL.agent : WALL.customer}
      </p>
    </figure>
  );
}
