import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";

const S = PIECE_SCREENS.cobros;
const pesos = (s: string) => Number(s.replace(/[^\d]/g, ""));
const total = S.rows.reduce((sum, r) => sum + pesos(r.amount), 0);

/**
 * La cartera, como en el panel (mockup Cobros premium F4): el resumen con su
 * barra por urgencia, la lista agrupada por a quién escribir primero y la isla
 * de cristal negro «Escribe primero a». Cobros, no facturación: no hay DIAN.
 */
export function CobrosScreen() {
  return (
    <div className="pp-cobros2">
      <div className="pp-page-head">
        <div>
          <h4 className="pp-page-title">{S.title}</h4>
          <p className="pp-page-sub">{S.order}</p>
        </div>
        <span className="pp-seg2">
          {S.views.map((v, i) => (
            <span key={v} data-on={i === 0 ? "" : undefined}>
              {v}
            </span>
          ))}
        </span>
      </div>

      <div className="pp-cobros2-grid">
        <div className="pp-cobros2-main">
          <div className="pp-card pp-cobros2-sum">
            <span className="pp-dim">{S.owedLabel}</span>
            <span className="pp-num pp-cobros2-owed">{S.owed}</span>
            <span className="pp-muted">{S.summary}</span>
            <span className="pp-cobros2-bar" aria-hidden="true">
              {S.rows.map((r) => (
                <i key={r.name} data-tone={r.tone} style={{ flexGrow: pesos(r.amount) / total }} />
              ))}
            </span>
          </div>

          <div className="pp-card pp-cobros2-list">
            {S.groups.map((group, g) => {
              const rows = S.rows.filter((r) => r.group === g);
              if (!rows.length) return null;
              const sum = rows.reduce((acc, r) => acc + pesos(r.amount), 0);
              return (
                <div key={group.label} className="pp-cobros2-group">
                  <div className="pp-cobros2-ghead">
                    <span>
                      <b>{group.label}</b> · {rows.length} {rows.length === 1 ? "cliente" : "clientes"}
                    </span>
                    <span className="pp-dim">$ {sum.toLocaleString("es-CO")}</span>
                  </div>
                  {rows.map((r) => (
                    <div key={r.name} className="pp-cobros2-row" data-tone={r.tone}>
                      <i className="pp-cobros2-dot" aria-hidden="true" />
                      <span className="pp-av">{r.initials}</span>
                      <span className="pp-cobros2-who">
                        <b>{r.name}</b>
                        <small>
                          {r.ref} · {r.concept}
                        </small>
                      </span>
                      <span className="pp-cobros2-state">{r.state}</span>
                      <span className="pp-num pp-cobros2-amt">{r.amount}</span>
                      <span className="pp-act">{S.write}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="pp-isle pp-cobros2-isle" data-tone="coral">
          <span className="pp-isle-kicker">{S.island.kicker}</span>
          <b className="pp-num pp-cobros2-isle-name">{S.island.name}</b>
          <span className="pp-num pp-cobros2-isle-amt">{S.island.amount}</span>
          <p className="pp-cobros2-isle-why">{S.island.why}</p>
          <dl className="pp-cobros2-facts">
            {S.island.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <span className="pp-grow" />
          <span className="pp-isle-btn">{S.island.actions[0]}</span>
          <span className="pp-cobros2-isle-alt">{S.island.actions[1]}</span>
        </aside>
      </div>
    </div>
  );
}
