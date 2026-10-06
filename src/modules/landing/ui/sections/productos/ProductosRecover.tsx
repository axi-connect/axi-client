import { PRODUCTOS_ANCHORS, RECOVER } from "@/modules/landing/ui/content/productos.content";

/**
 * #recuperar — «Lo que no cerraste hoy, Axi lo vuelve a buscar.» El
 * diferenciador (plan productos_tinta §4.4): una ficha por disparador real de
 * Recuperación, con un mensaje de ejemplo que sigue a los clientes del juego.
 * Server Component, sin JS.
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
      </div>
      <ul className="pj-wrap pj-rec-grid">
        {RECOVER.triggers.map((t) => (
          <li key={t.id} className="pj-card pj-rec-card">
            <p className="pj-dim m-0 text-[13px]">{t.kicker}</p>
            <h3 className="pj-card-title">{t.title}</h3>
            <figure className="pj-rec-msg">
              <figcaption className="pj-rec-when">{t.when}</figcaption>
              <blockquote aria-label={RECOVER.label}>{t.message}</blockquote>
            </figure>
          </li>
        ))}
      </ul>
      <div className="pj-wrap flex flex-col items-center text-center">
        <p className="pj-h pj-rec-closing">
          {RECOVER.closing.strong} <span className="t">{RECOVER.closing.thin}</span>
        </p>
        <p className="pj-dim mt-5 max-w-[44rem] text-[13px] leading-relaxed text-pretty">{RECOVER.fine}</p>
      </div>
    </section>
  );
}
