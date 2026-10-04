import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph } from "./parts";

const S = PIECE_SCREENS.crm;

/**
 * El pipeline, como en el panel (mockup CRM premium F1): cabecera con el
 * resumen de Axi y la acción principal, el bento de cifras con la isla «Lo
 * próximo» y el tablero por etapas. La tarjeta de Valentina es la del juego:
 * la abrió Axi desde la conversación.
 */
export function CrmScreen() {
  return (
    <div className="pp-crm2">
      <div className="pp-page-head">
        <div>
          <h4 className="pp-page-title">
            {S.title} <span className="pp-crm2-pick">{S.pipeline} ⌄</span>
          </h4>
          <p className="pp-page-sub">{S.sub}</p>
        </div>
        <span className="pp-crm2-actions">
          <span className="pp-seg2">
            {S.views.map((v, i) => (
              <span key={v} data-on={i === 0 ? "" : undefined}>
                {v}
              </span>
            ))}
          </span>
          <span className="pp-act pp-crm2-axi">
            <Glyph d={GLYPHS.sparkles} size={13} />
            {S.summaryAction}
          </span>
          <span className="pp-act" data-primary="">
            + {S.newAction}
          </span>
        </span>
      </div>

      <div className="pp-crm2-bento">
        <div className="pp-card pp-crm2-tile">
          <span className="pp-dim">{S.forecast.label}</span>
          <span className="pp-num pp-crm2-big">
            {S.forecast.value} <small>{S.forecast.of}</small>
          </span>
          <span className="pp-crm2-meter" aria-hidden="true">
            <i style={{ width: `${S.forecast.ratio * 100}%` }} />
          </span>
        </div>
        <div className="pp-card pp-crm2-tile">
          <span className="pp-dim">{S.won.label}</span>
          <span className="pp-num pp-crm2-big">{S.won.value}</span>
          <span className="pp-muted">{S.won.note}</span>
        </div>
        <div className="pp-card pp-crm2-tile">
          <span className="pp-dim">{S.rate.label}</span>
          <span className="pp-num pp-crm2-big">{S.rate.value}</span>
          <span className="pp-muted">{S.rate.note}</span>
        </div>
        <div className="pp-isle pp-crm2-next" data-tone="amber">
          <span className="pp-isle-kicker">{S.next.kicker}</span>
          <b className="pp-num pp-crm2-next-title">{S.next.title}</b>
          <span className="pp-crm2-next-text">{S.next.text}</span>
          <span className="pp-isle-btn pp-crm2-next-btn">{S.next.action} →</span>
        </div>
      </div>

      <div className="pp-crm2-board">
        {S.stages.map((stage) => (
          <div key={stage.name} className="pp-crm2-col">
            <div className="pp-crm2-colhead">
              <b>{stage.name}</b>
              <span className="pp-dim">{stage.prob}</span>
              <span className="pp-crm2-count">{stage.count}</span>
              <span className="pp-grow" />
              <span className="pp-num pp-crm2-total">{stage.total}</span>
            </div>
            {stage.deals.map((deal) => (
              <div key={deal.name} className="pp-crm2-deal" data-hot={deal.byAxi && deal.note ? "" : undefined}>
                <span className="pp-crm2-deal-top">
                  <b>{deal.name}</b>
                  <span className="pp-av">{deal.initials}</span>
                </span>
                <span className="pp-num pp-crm2-amt">{deal.value}</span>
                <span className="pp-muted">{deal.product}</span>
                <span className="pp-crm2-tags">
                  {deal.byAxi ? (
                    <span className="pp-crm2-tag" data-tone="violet">
                      <Glyph d={GLYPHS.sparkles} size={11} />
                      {S.byAxi}
                    </span>
                  ) : null}
                  {deal.note ? (
                    <span className="pp-crm2-tag" data-tone={deal.stale ? "amber" : undefined}>
                      {deal.note}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
