import { BrandMark } from "@/shared/components/ui/brand-mark"
import type { KitView } from "../../domain/kit-view"
import { AgentConnector, WelcomeSketch } from "../illustrations/KitIllustrations"
import s from "../welcome-kit.module.css"

/**
 * 01 · Bienvenida. El H1 y el párrafo dicen el literal «Axi», no el nombre del
 * agente (titular aprobado por el dueño el 24 sep, `copy-v2.md` §3): el resto
 * del kit sí usa el nombre del agente.
 */
export function KitWelcome({ view }: { view: KitView }) {
  return (
    <>
      <section data-screen-label="01 Bienvenida" className={s.welcome}>
        <div className={s.brandRow}>
          <div className={s.brand}>
            <BrandMark style={{ width: 38, height: 38 }} />
            <span>axi connect</span>
          </div>
          <span className={s.brandTag}>Kit de bienvenida</span>
        </div>

        <div className={s.welcomeCopy}>
          <span className={`${s.hand} ${s.dayZero}`}>día 0 — hoy empieza</span>
          <h1 className={s.h1}>Hoy empieza un negocio que vende sin detenerse.</h1>
          <p className={s.lead}>
            Desde hoy, Axi atiende el WhatsApp de {view.businessName} con tus productos y tus precios. Tú marcas
            el rumbo; Axi avanza contigo en cada conversación, y tu equipo entra cuando hace falta.
          </p>
        </div>

        <WelcomeSketch className={s.sketch} />

        <dl className={s.facts}>
          <div className={s.fact}>
            <dt>Negocio</dt>
            <dd>{view.businessName}</dd>
          </div>
          <div className={s.fact}>
            <dt>Tu agente</dt>
            <dd>{view.agentName}</dd>
          </div>
          <div className={s.fact}>
            <dt>Te acompaña</dt>
            <dd>{view.advisorName}</dd>
          </div>
          <div className={s.fact}>
            <dt>Tu prueba</dt>
            <dd className={s.tabular}>{view.trialRange}</dd>
          </div>
        </dl>
      </section>

      <div className={s.connector}>
        <AgentConnector label={view.agentConnector} />
      </div>
    </>
  )
}
