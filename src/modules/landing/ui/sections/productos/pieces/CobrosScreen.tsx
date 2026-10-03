import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { Initials, Kicker, Pill } from "./parts";

const S = PIECE_SCREENS.cobros;

/**
 * La cartera: lo que te deben, lo vencido y a quién escribir primero (la isla
 * de tinta «Escribe primero a»). Cobros, no facturación: no hay DIAN.
 */
export function CobrosScreen() {
  return (
    <div className="pp-cobros">
      <div className="pp-tile pp-owed">
        <Kicker>{S.owedLabel}</Kicker>
        <span className="pp-figure">{S.owed}</span>
        <span className="pp-overdue">
          {S.overdueLabel} · {S.overdue}
        </span>
        <span className="pp-dim pp-small">{S.order}</span>
        <span className="pp-grow" />
        <div className="pp-ink">
          <span className="pp-ink-body">
            <span className="pp-ink-kicker">{S.island.kicker}</span>
            <b>{S.island.name}</b>
            <span>{S.island.amount}</span>
          </span>
          <span className="pp-ink-actions">
            {S.island.actions.map((a, i) => (
              <span key={a} className="pp-btn" data-variant={i === 0 ? "contrast" : "glass"}>
                {a}
              </span>
            ))}
          </span>
        </div>
      </div>
      <ul className="pp-list">
        {S.rows.map((row) => (
          <li key={row.name} className="pp-item">
            <Initials>{row.initials}</Initials>
            <span className="pp-item-body">
              <b>{row.name}</b>
              <span>
                {row.concept} · {row.amount}
              </span>
            </span>
            <Pill tone={row.tone}>{row.state}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}
