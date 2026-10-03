import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph, Kicker } from "./parts";

const S = PIECE_SCREENS.crm;

/** El pipeline: la tarjeta que abrió Axi desde la conversación del juego. */
export function CrmScreen() {
  return (
    <div className="pp-crm">
      <div className="pp-row-head">
        <span className="pp-title">{S.title}</span>
        <span className="pp-forecast">
          <Kicker>{S.forecast.label}</Kicker>
          <b>{S.forecast.value}</b>
        </span>
      </div>
      <div className="pp-kanban">
        {S.stages.map((stage) => (
          <div key={stage.name} className="pp-stage">
            <Kicker>
              {stage.name} · {stage.count}
            </Kicker>
            {stage.deals.map((deal) => (
              <div key={deal.name} className="pp-deal" data-hot={deal.byAxi ? "" : undefined}>
                <b>{deal.name}</b>
                <span className="pp-deal-value">{deal.value}</span>
                {deal.byAxi ? (
                  <span className="pp-by-axi">
                    <Glyph d={GLYPHS.sparkles} size={11} />
                    {S.byAxi}
                  </span>
                ) : null}
                {deal.note ? <span className="pp-dim">{deal.note}</span> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
