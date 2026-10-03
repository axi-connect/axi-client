import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph, Initials, Pill } from "./parts";

const S = PIECE_SCREENS.inbox;

/**
 * La bandeja con su traspaso: la lista con quién atiende cada conversación y,
 * en el hilo, la isla «Axi te la pasó · 14 min · Atender» (la `ClaimIsland`
 * del panel). Sin logos de Instagram ni Messenger: dependen de Meta.
 */
export function InboxScreen() {
  return (
    <div className="pp-inbox">
      <div className="pp-col">
        <div className="pp-row-head">
          <span className="pp-title">{S.title}</span>
        </div>
        <div className="pp-seg" aria-hidden="true">
          {S.views.map((view, i) => (
            <span key={view} data-on={i === 0 ? "" : undefined}>
              {view}
            </span>
          ))}
        </div>
        <ul className="pp-list">
          {S.rows.map((row, i) => (
            <li key={row.name} className="pp-item" data-on={i === 0 ? "" : undefined}>
              <Initials>{row.initials}</Initials>
              <span className="pp-item-body">
                <b>{row.name}</b>
                <span>{row.preview}</span>
              </span>
              <Pill tone={row.tone}>
                {row.tone === "violet" ? <Glyph d={GLYPHS.sparkles} size={11} /> : null}
                {row.holder}
              </Pill>
            </li>
          ))}
        </ul>
      </div>
      <div className="pp-thread">
        {S.thread.map((m) => (
          <p key={m.text} className="pp-bubble" data-from={m.from}>
            {m.text}
          </p>
        ))}
        <p className="pp-event">
          <Glyph d={GLYPHS.sparkles} size={12} />
          {S.handoff}
        </p>
        <span className="pp-grow" />
        <div className="pp-claim">
          <span className="pp-claim-label">
            <Glyph d={GLYPHS.sparkles} size={13} />
            {S.claim.label}
          </span>
          <span className="pp-btn" data-variant="contrast">
            {S.claim.action}
          </span>
        </div>
        <div className="pp-quiet">
          {S.actions.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
