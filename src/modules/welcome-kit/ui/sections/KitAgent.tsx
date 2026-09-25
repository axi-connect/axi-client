import type { ReactNode } from "react"

import type { KitView } from "../../domain/kit-view"
import { OrderSketch, PanelConnector, PaySketch, QuoteSketch } from "../illustrations/KitIllustrations"
import s from "../welcome-kit.module.css"

/** 02 · 01 · Tu agente: las tres cosas que hace y quién confirma el pago. */
export function KitAgent({ view }: { view: KitView }) {
  return (
    <>
      <section data-screen-label="02 Tu agente" className={`${s.section} ${s.agent}`}>
        <div className={s.sectionHead}>
          <span className={s.kicker}>01 · Tu agente</span>
          <h2 className={`${s.h2} ${s.agentH2}`}>Vende por ti, con tus precios reales.</h2>
        </div>

        <div className={s.cards}>
          <Card
            sketch={<QuoteSketch className={`${s.sketch} ${s.cardSketch}`} />}
            title="Cotiza con tu catálogo"
            body="Responde en segundos con los precios que tú cargaste. No inventa precios ni da descuentos que no autorizaste."
          />
          <Card
            sketch={<OrderSketch className={`${s.sketch} ${s.cardSketch}`} />}
            title="Arma el pedido"
            body="Toma lo que el cliente pidió y lo deja listo para que tu equipo lo despache."
          />
          <Card
            sketch={<PaySketch className={`${s.sketch} ${s.cardSketch}`} />}
            title="Comparte tus medios de pago"
            body="Los que configuramos hoy, justo al cerrar cada pedido."
          />
        </div>

        <p className={s.closing}>
          <strong className={s.strong}>El pago lo confirma siempre tu equipo.</strong> {view.agentName} atiende; tú
          y tu gente siguen al mando.
        </p>
      </section>

      <div className={s.connector}>
        <PanelConnector />
      </div>
    </>
  )
}

function Card({ sketch, title, body }: { sketch: ReactNode; title: string; body: string }) {
  return (
    <div className={s.card}>
      {sketch}
      <div className={s.cardText}>
        <h3 className={s.cardTitle}>{title}</h3>
        <p className={s.cardBody}>{body}</p>
      </div>
    </div>
  )
}
