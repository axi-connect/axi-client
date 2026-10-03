import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { Kicker } from "./parts";

const S = PIECE_SCREENS.medicion;
const TOP = S.funnel[0]?.value ?? 1;

/** Ventas pagadas en pesos, el embudo y la calidad con qué corregir primero. */
export function MedicionScreen() {
  return (
    <div className="pp-metrics">
      <div className="pp-tile pp-sales">
        <Kicker>{S.salesLabel}</Kicker>
        <span className="pp-figure">{S.sales}</span>
        <span className="pp-dim pp-small">{S.flow}</span>
        <Kicker>{S.funnelLabel}</Kicker>
        <ul className="pp-funnel">
          {S.funnel.map((step) => (
            <li key={step.label}>
              <span className="pp-funnel-label">{step.label}</span>
              <span className="pp-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((step.value / TOP) * 100)}%` }} />
              </span>
              <b>{step.value}</b>
            </li>
          ))}
        </ul>
      </div>
      <div className="pp-col">
        <div className="pp-tile pp-quality">
          <Kicker>{S.qualityLabel}</Kicker>
          <span className="pp-ring" style={{ ["--v" as string]: S.quality }} aria-hidden="true" />
          <span className="pp-quality-value">
            <b>{S.quality}</b> <span className="pp-muted">{S.qualityOf}</span>
          </span>
          <ul className="pp-subs">
            {S.subscores.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <b>{s.value}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="pp-tile">
          <Kicker>{S.fixLabel}</Kicker>
          <ol className="pp-fixes">
            {S.fixes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
