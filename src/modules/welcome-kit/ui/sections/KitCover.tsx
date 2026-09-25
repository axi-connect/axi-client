import type { CSSProperties } from "react"

import { BrandMark } from "@/shared/components/ui/brand-mark"
import type { KitView } from "../../domain/kit-view"
import s from "../welcome-kit.module.css"

/**
 * Ancho real del escenario (900×502). Se escala para CABER entero en el ancho
 * del kit: con el diseño a 720, a 390 px el escenario medía 488 y los mosaicos
 * del catálogo y los pagos se salían del marco del teléfono (QA H2-8).
 */
const STAGE_WIDTH = 900
const STAGE_HEIGHT = 502

const STEPS: { n: number; label: string; state: "done" | "current" | "todo" }[] = [
  { n: 1, label: "Negocio", state: "done" },
  { n: 2, label: "Catálogo", state: "done" },
  { n: 3, label: "Pagos", state: "current" },
  { n: 4, label: "Horario", state: "todo" },
  { n: 5, label: "Listo", state: "todo" },
]

const STEP_CLASS = { done: s.stepDone, current: s.stepCurrent, todo: s.stepTodo }

/** Escala del escenario para un ancho de kit: 1 desde 900 px, proporcional por debajo. */
export function stageScale(width: number): number {
  return Math.min(1, width / STAGE_WIDTH)
}

/**
 * 00 · Portada: el wordmark y el escenario con el panel de configuración, el
 * catálogo y los medios de pago. El escenario mide 900×502 y se escala con el
 * ancho real del kit (lo mide el ResizeObserver de `WelcomeKitView`); hasta
 * medirlo no se pinta. Es un dibujo de la pantalla, no la pantalla: va
 * `aria-hidden`, y los datos que muestra ya los dice el texto del kit.
 */
export function KitCover({ view, width }: { view: KitView; width: number | null }) {
  const scale = stageScale(width ?? 900)
  const stageStyle: CSSProperties = { transform: `translateX(-50%) scale(${scale.toFixed(4)})` }

  return (
    <section data-screen-label="00 Portada" className={s.cover}>
      <div className={s.coverGlow} />
      <div className={s.coverTitle}>
        <span className={s.coverEyebrow}>Hoy empiezas con</span>
        <span className={s.coverWordmark}>axi connect</span>
      </div>

      <div
        className={s.stageWrap}
        data-measured={width !== null}
        style={{ height: Math.round(STAGE_HEIGHT * scale) }}
        aria-hidden="true"
      >
        <div className={s.stage} style={stageStyle}>
          <div className={s.halo1} />
          <div className={s.halo2} />

          <div className={s.window}>
            <div className={s.windowNav}>
              <div className={s.windowBrand}>
                <BrandMark style={{ width: 16, height: 16 }} />
                <span>axi connect</span>
              </div>
              <div className={s.windowMenu}>
                <span>Resumen</span>
                <span className={s.windowMenuActive}>Agente</span>
                <span>Conversaciones</span>
                <span>Pedidos</span>
                <span>Catálogo</span>
              </div>
            </div>
            <div className={s.windowBody}>
              <span className={s.windowTitle}>Configura a {view.agentName}</span>
              <div className={s.windowBadge}>
                Plan de prueba · 7 días · {view.trialConversations} conversaciones
              </div>
              <div className={s.steps}>
                {STEPS.map((step) => (
                  <div key={step.n} className={s.step}>
                    <div className={`${s.stepDot} ${STEP_CLASS[step.state]}`}>{step.n}</div>
                    <span className={step.state === "todo" ? s.stepTodoLabel : undefined}>{step.label}</span>
                  </div>
                ))}
              </div>
              <div className={s.windowLead}>
                <strong>Tu negocio</strong>
                <span>Así se presentará {view.agentName} a tus clientes</span>
              </div>
              <div className={s.fields}>
                <Field label="Nombre del negocio" value={view.businessName} />
                <Field label="Nombre del agente" value={view.agentName} />
                <Field label="Tono" value={view.agentTone} />
                <Field label="Horario de tu equipo" value={view.teamHours} />
              </div>
            </div>
          </div>

          <div className={`${s.floatCard} ${s.catalogCard}`}>
            <div className={s.catalogHead}>
              <span className={s.catalogFile}>{view.catalogFile}</span>
              {view.catalogSize ? <span className={s.tiny}>{view.catalogSize}</span> : null}
            </div>
            <span className={s.catalogNote}>{view.agentName} ya conoce tus productos y precios.</span>
            <div className={s.progress}>
              <span />
            </div>
            <div className={s.catalogFoot}>
              <span>{view.catalogCount} productos cargados</span>
              <span>100 %</span>
            </div>
          </div>

          <div className={`${s.floatCard} ${s.paymentsCard}`}>
            <span className={s.paymentsTitle}>Medios de pago</span>
            <span className={s.paymentsNote}>{view.agentName} los comparte al cerrar cada pedido</span>
            {view.payments.map((p) => (
              <div key={p.code} className={s.paymentRow}>
                <span>{p.label}</span>
                <div className={s.toggle} data-on={p.on}>
                  <span />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={s.coverFade} />
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.field}>
      <span>{label}</span>
      <div className={s.fieldBox}>{value}</div>
    </div>
  )
}
