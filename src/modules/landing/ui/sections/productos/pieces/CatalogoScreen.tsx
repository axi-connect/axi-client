import Image from "next/image";

import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { GLYPHS, Glyph, Kicker } from "./parts";

const S = PIECE_SCREENS.catalogo;

/**
 * La ficha con sus variantes, SKU y stock, y la búsqueda que tolera errores.
 * No promete que el agente cierre pedidos con variantes (INVENTARIO §2.2).
 */
export function CatalogoScreen() {
  return (
    <div className="pp-catalog">
      <div className="pp-tile pp-product">
        <Image src={S.imageSrc} alt={S.imageAlt} width={260} height={180} loading="lazy" />
        <span className="pp-product-body">
          <b>{S.name}</b>
          <span className="pp-muted">{S.price}</span>
        </span>
      </div>
      <div className="pp-col">
        <Kicker>{S.variantsLabel}</Kicker>
        <table className="pp-table">
          <thead>
            <tr>
              {S.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {S.variants.map((v) => (
              <tr key={v.sku} data-out={v.out ? "" : undefined}>
                <td>{v.name}</td>
                <td className="pp-mono">{v.sku}</td>
                <td>
                  <span className="pp-stock">{v.stock}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="pp-ready">{S.readiness}</p>
        <div className="pp-search" data-tone="violet">
          <Kicker>{S.search.label}</Kicker>
          <span className="pp-search-row">
            <Glyph d={GLYPHS.search} size={14} />
            <span className="pp-typed">{S.search.typed}</span>
            <span aria-hidden="true">→</span>
            <b>{S.search.found}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
