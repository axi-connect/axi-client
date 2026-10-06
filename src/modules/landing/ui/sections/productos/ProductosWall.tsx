import "./wall.css";

import { FaWhatsapp } from "react-icons/fa";

import { WALL, type WallMessage } from "@/modules/landing/ui/content/productos.content";
import { MarqueeColumn } from "@/modules/landing/ui/components/MarqueeColumn";

/** Velocidades distintas por columna: la diferencia de ritmo da profundidad. */
const SPEEDS = ["46s", "58s", "52s", "62s"] as const;

/**
 * #conversaciones — «Así suena un negocio con Axi», el muro del /productos
 * original recuperado entre el video y el cierre (pedido de la dueña). Tres
 * columnas en marquee CSS (a la derecha del texto desde la vuelta en tinta) (compositor, cero JS: es RSC) inclinadas en
 * perspectiva; el hover pausa y movimiento reducido lo deja quieto.
 *
 * Negocios y mensajes de ejemplo, solo WhatsApp (ver `WALL` en el contenido).
 * El mensaje del agente va en tinta invertida, como en el chat del juego.
 */
export function ProductosWall() {
  return (
    <section id={WALL.anchor} aria-labelledby="muro-title" className="pj-wall">
      <div className="pj-glow" aria-hidden="true" />
      {/* Dos columnas (plan productos_tinta §4, D4): el texto a la izquierda y el
          muro, el mismo de siempre, ocupando la altura a la derecha. */}
      <div className="pj-wall-copy">
        <p className="pj-eyebrow text-[var(--axi-brand)]">{WALL.eyebrow}</p>
        <h2 id="muro-title" className="pj-h pj-h-lg">
          <span className="block">{WALL.strong}</span>{" "}
          <span className="t block">{WALL.thin}</span>
        </h2>
        <p className="pj-lead max-w-[30rem] text-pretty">{WALL.lead}</p>
        <span className="pj-wall-sample">{WALL.sample}</span>
      </div>

      <div className="pj-wall-stage group/wall" role="group" aria-label={WALL.label}>
        <div className="pj-wall-tilt">
          {WALL.columns.map((column, i) => (
            <MarqueeColumn key={SPEEDS[i]} reverse={i % 2 === 1} duration={SPEEDS[i]} className={i >= 2 ? "pj-wall-col pj-wall-col-last" : "pj-wall-col"}>
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

/** Cada negocio con su tono suave: el muro se lee como chats distintos, sin gritar. */
const TINTS = ["coral", "violet", "amber", "ok"] as const;
const tintOf = (business: string) => TINTS[[...business].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length];

function WallCard({ message, repeat }: { message: WallMessage; repeat: boolean }) {
  const agent = message.from === "agent";
  return (
    <figure className="pj-wall-card" data-from={message.from} aria-hidden={repeat || undefined}>
      <figcaption className="pj-wall-who">
        <span className="pj-wall-av" data-tint={tintOf(message.business)} aria-hidden="true">
          {message.business.charAt(0)}
        </span>
        <span className="pj-wall-biz">{message.business}</span>
        {/* El canal con su color oficial (DESIGN-SYSTEM §7: el color va solo en el glifo). */}
        <FaWhatsapp className="pj-wall-ch text-logo-whatsapp" aria-label={WALL.channel} role="img" />
      </figcaption>
      <blockquote className="pj-wall-text">{message.text}</blockquote>
      <p className="pj-wall-by">
        {/* Marca y doble check en CSS y texto: la tarjeta se repite cuatro veces en el bucle y cada SVG cuenta. */}
        {agent ? <i className="pj-wall-axi" aria-hidden="true" /> : null}
        <span>{agent ? WALL.agent : WALL.customer}</span>
        <span className="pj-wall-time">
          {message.time}
          {agent ? <span aria-hidden="true"> ✓✓</span> : null}
        </span>
      </p>
    </figure>
  );
}
