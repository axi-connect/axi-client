import { Kanban, MessageCircle, ShoppingBag, type LucideIcon } from "lucide-react";

import { PRODUCTOS_ANCHORS, RECOVER } from "@/modules/landing/ui/content/productos.content";

const ICONS: Record<(typeof RECOVER.triggers)[number]["id"], LucideIcon> = {
  carrito: ShoppingBag,
  frio: MessageCircle,
  trato: Kanban,
};

/**
 * #recuperar — «Lo que no cerraste hoy, Axi lo vuelve a buscar.» El
 * diferenciador (plan productos_tinta §4.4). Cada ficha cuenta una venta a
 * medias en tres tiempos: lo que quedó quieto (con su dato), cuándo escribe
 * Axi y el mensaje. Los disparadores son los de Recuperación; que es de
 * Crecimiento y Escala lo dice la sección de precio. Server Component.
 */
export function ProductosRecover() {
  return (
    <section id={PRODUCTOS_ANCHORS.recover} aria-labelledby="recuperar-title" className="pj-band pj-recover">
      <div className="pj-wrap flex flex-col items-center gap-6 text-center">
        <h2 id="recuperar-title" className="pj-h pj-h-lg">
          <span className="block">{RECOVER.strong}</span>{" "}
          <span className="t block">{RECOVER.thin}</span>
        </h2>
        <p className="pj-lead max-w-[38rem] text-pretty">{RECOVER.lead}</p>
        <span className="pj-sample">{RECOVER.sample}</span>
      </div>
      <ul className="pj-wrap pj-rec-grid">
        {RECOVER.triggers.map((t) => {
          const Icon = ICONS[t.id];
          return (
            <li key={t.id} className="pj-rec-card">
              <div className="pj-rec-top">
                <span className="pj-rec-glyph" aria-hidden="true">
                  <Icon className="size-[18px]" strokeWidth={1.8} />
                </span>
                <span className="pj-rec-kicker">{t.kicker}</span>
              </div>
              <h3 className="pj-card-title">{t.title}</h3>
              <div className="pj-rec-ctx">
                <span className="pj-rec-ctx-top">
                  <small>{t.context.label}</small>
                  <span className="pj-rec-state">{t.context.state}</span>
                </span>
                <b>{t.context.detail}</b>
              </div>
              <p className="pj-rec-when">
                <i aria-hidden="true" />
                {RECOVER.writes} · {t.when}
              </p>
              <figure className="pj-rec-msg">
                <blockquote aria-label={RECOVER.label}>{t.message}</blockquote>
                <figcaption aria-hidden="true">✓✓</figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
      <div className="pj-wrap flex flex-col items-center text-center">
        <p className="pj-h pj-rec-closing">
          {RECOVER.closing.strong} <span className="t">{RECOVER.closing.thin}</span>
        </p>
      </div>
    </section>
  );
}
