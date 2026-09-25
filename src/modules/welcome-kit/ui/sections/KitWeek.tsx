import type { KitDay, KitView } from "../../domain/kit-view"
import { PlanConnector } from "../illustrations/KitIllustrations"
import s from "../welcome-kit.module.css"

/** Trazo del conector entre días: el primero (hoy → mañana), coral y continuo. */
const LINE = {
  lead: { stroke: "var(--kit-coral)", dash: "none" },
  dotted: { stroke: "color-mix(in srgb, var(--kit-text) 35%, transparent)", dash: "3 8" },
} as const

/** 04 · 03 · Tu semana de prueba: los ocho días y el cupo de conversaciones. */
export function KitWeek({ view }: { view: KitView }) {
  return (
    <>
      <section data-screen-label="04 Tu semana" className={`${s.section} ${s.week}`}>
        <div className={s.sectionHead}>
          <span className={s.kicker}>03 · Tu semana de prueba</span>
          <h2 className={`${s.h2} ${s.weekH2}`}>Siete días con clientes reales.</h2>
          <p className={s.weekLead}>
            Solo te pedimos dos ratos cortos: 10 minutos el día 2 y 15 minutos el día 5. El día 7, con resultados en
            la mano, decides.
          </p>
        </div>

        <ol className={s.days}>
          {view.days.map((day) => (
            <DayRow key={day.n} day={day} />
          ))}
        </ol>

        <div className={s.quota}>
          <span className={s.quotaNumber}>{view.trialConversations}</span>
          <p className={s.quotaText}>
            <strong className={s.strong}>conversaciones con IA incluidas en la prueba.</strong> Si llegas a ellas
            antes del día 7, {view.agentName} hace una pausa y tu equipo sigue atendiendo desde el panel: tu negocio
            nunca se queda sin respuesta. Si ves que no te alcanzan, avísale a {view.advisorFirstName}.
          </p>
        </div>
      </section>

      <div className={s.connector}>
        <PlanConnector />
      </div>
    </>
  )
}

function DayRow({ day }: { day: KitDay }) {
  const line = LINE[day.lineStyle]
  return (
    <li className={s.day}>
      <div className={s.dayNumber}>
        <span>Día</span>
        <span>{day.n}</span>
      </div>
      <div className={s.dayRail} aria-hidden="true">
        {day.hasLine ? (
          <svg viewBox="0 0 48 84" preserveAspectRatio="none" className={s.dayLine} focusable="false">
            <g filter="url(#wk-rough)">
              <path
                d="M24 0 C34 21 14 63 24 84"
                fill="none"
                stroke={line.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={line.dash}
                vectorEffect="non-scaling-stroke"
              ></path>
            </g>
          </svg>
        ) : null}
        <svg viewBox="0 0 32 32" width="32" height="32" className={s.dayNode} focusable="false">
          <g filter="url(#wk-glow)">
            <DayNode node={day.node} />
          </g>
        </svg>
      </div>
      <div className={s.dayContent}>
        <div className={s.dayText}>
          <span className={s.dayTitle}>{day.title}</span>
          <span className={s.dayBody}>{day.body}</span>
        </div>
        {day.tag ? <span className={`${s.hand} ${s.dayTag}`}>{day.tag}</span> : null}
      </div>
    </li>
  )
}

function DayNode({ node }: { node: KitDay["node"] }) {
  switch (node) {
    case "now":
      return (
        <>
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--kit-coral)" strokeWidth="2" opacity=".45"></circle>
          <circle cx="16" cy="16" r="7" fill="var(--kit-coral)"></circle>
        </>
      )
    case "meet":
      return <circle cx="16" cy="16" r="8" fill="var(--kit-coral)" fillOpacity=".5" stroke="var(--kit-coral)" strokeWidth="2"></circle>
    case "end":
      return <circle cx="16" cy="16" r="9" fill="var(--kit-amber)"></circle>
    default:
      return <circle cx="16" cy="16" r="6" fill="var(--kit-bg)" stroke="color-mix(in srgb, var(--kit-text) 50%, transparent)" strokeWidth="2"></circle>
  }
}
