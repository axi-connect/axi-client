import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph } from "./parts";

const S = PIECE_SCREENS.llamadas;
const BARS = [6, 12, 18, 9, 22, 14, 26, 11, 19, 8, 24, 16, 10, 21, 13, 27, 9, 17, 12, 23, 7, 15, 20, 11, 25, 14, 8, 18];

/**
 * Las llamadas, como en el panel: el historial con el resultado de cada una y
 * la llamada abierta —saliente: las entrantes solo toman recado— con sus
 * etapas, la grabación y lo que Axi anotó al colgar.
 */
export function LlamadasScreen() {
  return (
    <div className="pp-calls2">
      <div className="pp-page-head">
        <h4 className="pp-page-title">{S.title}</h4>
        <span className="pp-seg2">
          {S.tabs.map((t, i) => (
            <span key={t} data-on={i === 1 ? "" : undefined}>
              {t}
            </span>
          ))}
        </span>
      </div>
      <div className="pp-calls2-grid">
        <div className="pp-card pp-calls2-list">
          {S.calls.map((c) => (
            <span key={c.who} className="pp-calls2-row" data-on={c.on ? "" : undefined}>
              <span className="pp-calls2-ico">
                <Glyph d={GLYPHS.phone} size={14} />
              </span>
              <span className="pp-calls2-body">
                <b>{c.who}</b>
                <small>{c.kind}</small>
              </span>
              <span className="pp-calls2-side">
                <span className="pp-calls2-res" data-tone={c.tone}>
                  {c.result}
                </span>
                <small className="pp-num">{c.length}</small>
              </span>
            </span>
          ))}
        </div>
        <div className="pp-card pp-calls2-detail">
          <div className="pp-calls2-top">
            <b>{S.who}</b>
            <span className="pp-calls2-res" data-tone="ok">
              {S.result}
            </span>
          </div>
          <div className="pp-calls2-player">
            <span className="pp-calls2-play" aria-hidden="true">
              ▶
            </span>
            <span className="pp-calls2-wave" aria-hidden="true">
              {BARS.map((h, i) => (
                <i key={i} style={{ height: h }} data-past={i < 17 ? "" : undefined} />
              ))}
            </span>
            <small className="pp-num">2:14</small>
          </div>
          <div className="pp-calls2-stages">
            {S.stages.map((st, i) => (
              <span key={st.label} data-on={st.reached ? "" : undefined}>
                <i>{i + 1}</i>
                {st.label}
              </span>
            ))}
          </div>
          <span className="pp-kicker">{S.notesLabel}</span>
          <dl className="pp-calls2-notes">
            {S.notes.map((n) => (
              <div key={n.label}>
                <dt>{n.label}</dt>
                <dd>{n.text}</dd>
              </div>
            ))}
          </dl>
          <span className="pp-dim pp-calls2-sum">
            <Glyph d={GLYPHS.sparkles} size={12} />
            {S.summary}
          </span>
        </div>
      </div>
    </div>
  );
}
