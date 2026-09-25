import type { KitView } from "../../domain/kit-view"
import { PriceOval, PriceStrike } from "../illustrations/KitIllustrations"
import s from "../welcome-kit.module.css"

/**
 * 05 · 04 · Si decides seguir. Plan y precios salen de la oferta cotizada en
 * «Preparar entrega» (E5): nunca van fijos en el kit.
 */
export function KitPlan({ view }: { view: KitView }) {
  return (
    <section data-screen-label="05 Si decides seguir" className={`${s.section} ${s.plan}`}>
      <div className={s.sectionHead}>
        <span className={s.kicker}>04 · Si decides seguir</span>
        <h2 className={`${s.h2} ${s.planH2}`}>Un precio claro para seguir avanzando.</h2>
      </div>

      <div className={s.planGrid}>
        <div className={s.planOffer}>
          <span className={s.planName}>{view.planName}</span>
          <span className={s.planMeta}>Hasta {view.planConversations} conversaciones al mes</span>
          <div className={s.price}>
            <PriceOval className={s.priceOval} />
            <span className={s.priceAmount}>{view.priceFmt}</span>
            <span className={s.pricePeriod}>/ mes</span>
          </div>
          <div className={s.listPrice}>
            <span className={s.listPriceAmount}>
              {/* El tachón es un dibujo: para un lector de pantalla, el precio de
                  lista se anuncia como tal y no como el precio vigente. */}
              <del>{view.listPriceFmt}</del>
              <PriceStrike className={s.listPriceStrike} />
            </span>
            <span className={s.listPriceLabel}>precio de lista</span>
          </div>
          <span className={`${s.hand} ${s.founder}`}>precio de fundador, congelado mientras sigas</span>
        </div>

        <dl className={s.rows}>
          {view.planRows.map((row) => (
            <div key={row.k} className={s.planRow}>
              <dt>{row.k}</dt>
              <dd>{row.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={s.saved}>
        <h3 className={s.savedH3}>Tu camino queda guardado.</h3>
        <p className={s.savedText}>
          Si decides no seguir, no pagas nada. Al terminar la prueba tu cuenta se pausa y el panel se cierra, pero tu
          configuración queda guardada: {view.agentName}, tu catálogo y tus medios de pago se reactivan con el pago,
          sin empezar de cero.
        </p>
      </div>
    </section>
  )
}
