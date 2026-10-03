import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph, Kicker, Pill } from "./parts";

const S = PIECE_SCREENS.llamadas;

/**
 * Una llamada SALIENTE terminada: el aura, la línea de etapas y lo que Axi
 * anota al colgar. Las entrantes solo toman recado (INVENTARIO §2.1), por eso
 * aquí no se enseña una entrante que vende.
 */
export function LlamadasScreen() {
  return (
    <div className="pp-calls">
      <div className="pp-tile pp-call">
        <span className="pp-aura" aria-hidden="true">
          <Glyph d={GLYPHS.phone} size={26} />
        </span>
        <span className="pp-call-who">{S.who}</span>
        <ol className="pp-steps">
          {S.stages.map((stage) => (
            <li key={stage.label} data-on={stage.reached ? "" : undefined}>
              {stage.label}
            </li>
          ))}
        </ol>
        <Pill tone="ok">{S.result}</Pill>
      </div>
      <div className="pp-col">
        <Kicker>{S.notesLabel}</Kicker>
        <dl className="pp-notes">
          {S.notes.map((note) => (
            <div key={note.label}>
              <dt>{note.label}</dt>
              <dd>{note.text}</dd>
            </div>
          ))}
        </dl>
        <span className="pp-dim pp-small">
          <Glyph d={GLYPHS.sparkles} size={11} /> {S.summary}
        </span>
      </div>
    </div>
  );
}
