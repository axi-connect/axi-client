import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph } from "./parts";

const S = PIECE_SCREENS.inbox;

/**
 * La bandeja, como en el panel (mockup Inbox premium F1+F2): las carpetas con
 * sus cuentas y los canales, la lista de la cola y la conversación con la
 * isla «Axi te la pasó · Atender». El relevo queda en la línea de tiempo.
 */
export function InboxScreen() {
  return (
    <div className="pp-inbox2">
      <nav className="pp-inbox2-folders" aria-hidden="true">
        <span className="pp-kicker">Bandeja</span>
        {S.folders.map((f) => (
          <span key={f.label} className="pp-inbox2-folder" data-on={f.on ? "" : undefined}>
            <span className="pp-grow">{f.label}</span>
            {f.count ? <span className="pp-dim">{f.count}</span> : null}
          </span>
        ))}
        <span className="pp-kicker pp-inbox2-chlabel">
          {S.channelsLabel} · {S.channels.length}
        </span>
        {S.channels.map((c) => (
          <span key={c.label} className="pp-inbox2-channel">
            <i aria-hidden="true" />
            <span>
              {c.label}
              {c.note ? <small>{c.note}</small> : null}
            </span>
          </span>
        ))}
      </nav>

      <div className="pp-inbox2-list">
        <h4 className="pp-page-title pp-inbox2-title">{S.listTitle}</h4>
        <span className="pp-page-sub pp-inbox2-sub">{S.listSub}</span>
        <span className="pp-inbox2-search">
          <Glyph d={GLYPHS.search} size={13} />
          {S.search}
        </span>
        {S.rows.map((row) => (
          <span key={row.name} className="pp-inbox2-row" data-on={row.on ? "" : undefined} data-tone={row.tone}>
            <span className="pp-av">{row.initials}</span>
            <span className="pp-inbox2-rowbody">
              <span className="pp-inbox2-rowtop">
                <b>{row.name}</b>
                <small>{row.time}</small>
              </span>
              <span className="pp-inbox2-prev">{row.preview}</span>
              <span className="pp-inbox2-holder">{row.holder}</span>
            </span>
            {row.unread ? <span className="pp-app-badge">{row.unread}</span> : null}
          </span>
        ))}
      </div>

      <div className="pp-inbox2-conv">
        <div className="pp-inbox2-head">
          <span className="pp-av">{S.head.initials}</span>
          <span className="pp-inbox2-who">
            <b>{S.head.name}</b>
            <small>{S.head.channel}</small>
          </span>
          <span className="pp-grow" />
          <span className="pp-inbox2-claim">
            <Glyph d={GLYPHS.sparkles} size={12} />
            {S.claim.label}
            <b>{S.claim.action}</b>
          </span>
        </div>
        <div className="pp-inbox2-thread">
          <span className="pp-inbox2-day">{S.day}</span>
          {S.thread.map((m) => (
            <div key={m.text} className="pp-inbox2-msg" data-from={m.from}>
              {m.from === "agent" ? <span className="pp-inbox2-by">Axi</span> : null}
              <p>
                {m.text}
                <small>{m.time}</small>
              </p>
            </div>
          ))}
          {S.events.map((e) => (
            <span key={e} className="pp-inbox2-event">
              {e}
            </span>
          ))}
        </div>
        <div className="pp-inbox2-foot">
          <span className="pp-dim">{S.footer}</span>
          <span className="pp-grow" />
          <span className="pp-act" data-primary="">
            {S.claim.action}
          </span>
        </div>
      </div>
    </div>
  );
}
