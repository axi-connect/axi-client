import Image from "next/image";

import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph } from "./parts";

const S = PIECE_SCREENS.catalogo;
const GLASSES = "M2 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0M14 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0M10 13h4M2 13l2-6h3M22 13l-2-6h-3";

/**
 * El catálogo, como en el panel: la lista de productos con su stock y la ficha
 * abierta con sus variantes por SKU. Debajo, la búsqueda que entiende al
 * cliente aunque escriba mal. No se promete cerrar pedidos con variantes.
 */
export function CatalogoScreen() {
  return (
    <div className="pp-catalog2">
      <div className="pp-page-head">
        <div>
          <h4 className="pp-page-title">{S.title}</h4>
          <p className="pp-page-sub">{S.sub}</p>
        </div>
        <span className="pp-inbox2-search pp-catalog2-search">
          <Glyph d={GLYPHS.search} size={13} />
          {S.search.typed}
          <span className="pp-catalog2-found">→ {S.search.found}</span>
        </span>
      </div>
      <div className="pp-catalog2-grid">
        <div className="pp-card pp-catalog2-list">
          {S.products.map((p) => (
            <span key={p.name} className="pp-catalog2-item" data-on={p.on ? "" : undefined}>
              <span className="pp-catalog2-thumb">
                {p.on ? <Image src={S.imageSrc} alt="" width={44} height={44} /> : <Glyph d={GLASSES} size={20} />}
              </span>
              <span className="pp-catalog2-itembody">
                <b>{p.name}</b>
                <small data-out={p.out ? "" : undefined}>{p.stock}</small>
              </span>
              <span className="pp-num">{p.price}</span>
            </span>
          ))}
        </div>
        <div className="pp-card pp-catalog2-detail">
          <div className="pp-catalog2-photo">
            <Image src={S.imageSrc} alt={S.imageAlt} width={300} height={225} />
          </div>
          <div className="pp-catalog2-info">
            <span className="pp-dim">{S.category}</span>
            <b className="pp-num pp-catalog2-name">{S.name}</b>
            <span className="pp-num pp-catalog2-price">{S.price}</span>
            <span className="pp-kicker pp-catalog2-vlabel">{S.variantsLabel}</span>
            <table className="pp-catalog2-table">
              <thead>
                <tr>
                  {S.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {S.variants.map((v) => (
                  <tr key={v.sku} data-out={v.out ? "" : undefined}>
                    <td>{v.name}</td>
                    <td className="pp-dim">{v.sku}</td>
                    <td>{v.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span className="pp-catalog2-ready">
              <Glyph d={GLYPHS.sparkles} size={12} />
              {S.readiness}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
