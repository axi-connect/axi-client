import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph } from "./parts";

const S = PIECE_SCREENS.llamadas;

/**
 * Picos de la onda (0–1) y quién habla en cada tramo, con la misma regla que
 * `RecordingWaveform` del panel: el agente en violeta y el cliente en coral;
 * lo que ya sonó, entero, y lo que falta, atenuado.
 */
const PEAKS = [
  0.3, 0.55, 0.8, 0.6, 0.9, 0.5, 0.7, 0.4, 0.2, 0.35, 0.6, 0.45, 0.15, 0.5, 0.75, 0.95, 0.7, 0.85, 0.55, 0.65, 0.4, 0.8, 0.6, 0.3,
  0.2, 0.45, 0.7, 0.5, 0.25, 0.6, 0.85, 0.7, 0.5, 0.35, 0.55, 0.4, 0.65, 0.3, 0.5, 0.2,
] as const;
const SPEAKER = (i: number) => (i < 9 ? "agent" : i < 13 ? "caller" : i < 24 ? "agent" : i < 30 ? "caller" : "agent");
const PLAYED = 26;

/**
 * La llamada terminada, como `FinishedCallView` del panel (llamadas premium
 * F4): cabecera con el resultado, la grabación en tinta con su onda por
 * hablante, la conversación sincronizada y la isla «Así fue la llamada» con
 * las etapas que recorrió. Saliente: las entrantes solo toman recado.
 */
export function LlamadasScreen() {
  const sum = S.summary;
  return (
    <div className="pp-fcall">
      <header className="pp-fcall-head">
        <span className="pp-fcall-back">‹ {S.back}</span>
        <span className="pp-fcall-title">
          <b>{S.who}</b>
          <span className="pp-fcall-pill">{S.result}</span>
        </span>
        <small>{S.meta}</small>
        <span className="pp-fcall-action">{S.action}</span>
      </header>

      <div className="pp-fcall-grid">
        <div className="pp-fcall-main">
          <section className="pp-fcall-rec" aria-label={S.recording.title}>
            <div className="pp-fcall-rec-top">
              <b>{S.recording.title}</b>
              <span>
                <i data-role="agent" />
                {S.recording.agent}
                <i data-role="caller" />
                {S.recording.caller}
              </span>
            </div>
            <span className="pp-fcall-wave" aria-hidden="true">
              {PEAKS.map((p, i) => (
                <i key={i} data-role={SPEAKER(i)} data-past={i < PLAYED ? "" : undefined} style={{ height: `${Math.round(8 + p * 38)}px` }} />
              ))}
            </span>
            <div className="pp-fcall-rec-bar">
              <span className="pp-fcall-play" aria-hidden="true">
                <Glyph d={GLYPHS.play} size={14} />
              </span>
              <span className="pp-num">
                {S.recording.at} <span className="pp-dim">/ {S.recording.total}</span>
              </span>
              <span className="pp-fcall-rates">
                {S.recording.rates.map((r, i) => (
                  <span key={r} data-on={i === 0 ? "" : undefined}>
                    {r}
                  </span>
                ))}
              </span>
            </div>
          </section>

          <section className="pp-card pp-fcall-talk" aria-label={S.transcriptLabel}>
            {S.transcript.map((t, i) => (
              <div key={t.clock} className="pp-fcall-turn" data-on={i === S.transcript.length - 1 ? "" : undefined}>
                <span className="pp-num pp-dim">{t.clock}</span>
                <span>
                  <b>
                    <i data-role={t.role} />
                    {t.role === "agent" ? "Vera" : S.recording.caller}
                  </b>
                  {t.text}
                </span>
              </div>
            ))}
          </section>
        </div>

        <aside className="pp-fcall-island">
          <span className="pp-kicker">{sum.kicker}</span>
          <b className="pp-fcall-island-title">{sum.title}</b>
          <p>{sum.text}</p>
          <div className="pp-fcall-route">
            <div className="pp-fcall-route-top">
              <span>
                <span className="pp-dim">{sum.reachedLabel}</span> <b>{sum.reached}</b>
              </span>
              <span className="pp-num pp-dim">{sum.of}</span>
            </div>
            <ol>
              {sum.stages.map((st) => (
                <li key={st.label} data-met={st.note ? "" : undefined}>
                  <i aria-hidden="true">{st.note ? "✓" : ""}</i>
                  <span>
                    {st.label}
                    {st.note ? <small>{st.note}</small> : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="pp-fcall-verdict">
            <i aria-hidden="true" />
            <span>
              <b>{sum.verdict}</b>
              <small>{sum.reason}</small>
            </span>
          </div>
          <span className="pp-fcall-foot">
            <Glyph d={GLYPHS.sparkles} size={12} />
            {sum.foot}
          </span>
        </aside>
      </div>
    </div>
  );
}
