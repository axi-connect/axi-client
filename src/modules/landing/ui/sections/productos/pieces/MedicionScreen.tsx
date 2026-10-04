import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";

const S = PIECE_SCREENS.medicion;
const top = S.funnel[0].value;

/**
 * La analítica, como en el panel: tres planos que no se mezclan. Las ventas
 * pagadas en pesos con su embudo (hechos), la calidad que juzga una IA
 * supervisora (juicio) y qué corregir primero.
 */
export function MedicionScreen() {
  const ring = 2 * Math.PI * 42;
  return (
    <div className="pp-metrics2">
      <div className="pp-page-head">
        <div>
          <h4 className="pp-page-title">{S.title}</h4>
          <p className="pp-page-sub">{S.sub}</p>
        </div>
        <span className="pp-seg2">
          {S.tabs.map((t, i) => (
            <span key={t} data-on={i === 0 ? "" : undefined}>
              {t}
            </span>
          ))}
        </span>
      </div>
      <div className="pp-metrics2-grid">
        <div className="pp-card pp-metrics2-sales">
          <span className="pp-dim">{S.salesLabel}</span>
          <span className="pp-num pp-metrics2-big">{S.sales}</span>
          <span className="pp-muted">{S.flow}</span>
          <span className="pp-kicker pp-metrics2-flabel">{S.funnelLabel}</span>
          <div className="pp-metrics2-funnel">
            {S.funnel.map((f, i) => (
              <span key={f.label} className="pp-metrics2-step">
                <span className="pp-metrics2-steplabel">{f.label}</span>
                <span className="pp-metrics2-bar">
                  <i style={{ width: `${(f.value / top) * 100}%` }} data-last={i === S.funnel.length - 1 ? "" : undefined} />
                </span>
                <b className="pp-num">{f.value}</b>
              </span>
            ))}
          </div>
          <span className="pp-dim pp-metrics2-note">{S.salesNote}</span>
        </div>
        <div className="pp-metrics2-side">
          <div className="pp-card pp-metrics2-quality">
            <svg viewBox="0 0 100 100" className="pp-metrics2-ring" aria-hidden="true">
              <circle cx="50" cy="50" r="42" />
              <circle cx="50" cy="50" r="42" data-v="" strokeDasharray={`${(ring * S.quality) / 100} ${ring}`} />
            </svg>
            <span className="pp-metrics2-q">
              <b className="pp-num">{S.quality}</b>
              <small>{S.qualityOf}</small>
            </span>
            <div className="pp-metrics2-subs">
              <span className="pp-dim">{S.qualityLabel}</span>
              {S.subscores.map((x) => (
                <span key={x.label}>
                  {x.label}
                  <b className="pp-num">{x.value}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="pp-isle pp-metrics2-fix" data-tone="coral">
            <span className="pp-isle-kicker">{S.fixLabel}</span>
            {S.fixes.map((f, i) => (
              <span key={f} className="pp-metrics2-fixrow">
                <i>{i + 1}</i>
                <span>
                  <b>{f}</b>
                  <small>{S.fixCounts[i]}</small>
                </span>
              </span>
            ))}
            <span className="pp-metrics2-qnote">{S.qualityNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
