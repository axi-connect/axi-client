import type { KitView } from "../../domain/kit-view"
import { DigestSketch, PanelSketch, WeekConnector } from "../illustrations/KitIllustrations"
import s from "../welcome-kit.module.css"

/**
 * 03 · 02 · Tu panel y tu mañana. La contraseña NO aparece: el dueño la crea con
 * el enlace de un solo uso del correo (E1), y el kit lo dice.
 */
export function KitPanel({ view }: { view: KitView }) {
  return (
    <>
      <section data-screen-label="03 Tu panel" className={`${s.section} ${s.panel}`}>
        <div className={s.sectionHead}>
          <span className={s.kicker}>02 · Tu panel y tu mañana</span>
          <h2 className={`${s.h2} ${s.panelH2}`}>Siempre sabes cuánto avanzaste.</h2>
        </div>

        <div className={s.split}>
          <PanelSketch className={`${s.sketch} ${s.splitSketch}`} />
          <div className={s.splitText}>
            <h3 className={s.h3}>Tu panel, en un solo lugar.</h3>
            <dl className={s.rows}>
              <div className={s.row}>
                <dt>Enlace</dt>
                <dd>
                  <a href={view.panelHref}>{view.panelUrl}</a>
                </dd>
              </div>
              <div className={s.row}>
                <dt>Correo</dt>
                <dd>{view.loginEmail}</dd>
              </div>
            </dl>
            <p className={s.note}>
              <strong className={s.strong}>Tu contraseña es solo tuya.</strong> La eliges tú con el enlace que te
              llegó por correo, y nadie en Axi la conoce, ni siquiera {view.advisorFirstName}. Por eso no aparece
              aquí.
            </p>
          </div>
        </div>

        <div className={s.split}>
          <div className={`${s.splitText} ${s.splitTextTight}`}>
            <h3 className={s.h3}>Cada mañana, tres números en tu WhatsApp.</h3>
            <p className={s.body15}>
              Conversaciones atendidas, pedidos creados y valor cotizado el día anterior. Te llegan a las{" "}
              {view.digestTime}: sabes cómo vas sin abrir el panel.
            </p>
            <span className={s.fineprint}>Cifras del boceto a modo de ejemplo.</span>
          </div>
          <DigestSketch className={`${s.sketch} ${s.splitSketch}`} digestTimeUpper={view.digestTimeUpper} />
        </div>
      </section>

      <div className={s.connector}>
        <WeekConnector />
      </div>
    </>
  )
}
