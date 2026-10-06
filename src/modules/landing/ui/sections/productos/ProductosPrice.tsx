import Link from "next/link";
import { Check } from "lucide-react";

import type { PublicCatalog } from "@/modules/landing/domain/public-catalog";
import { formatCop } from "@/modules/landing/ui/content/landing.content";
import { PRICE, PRODUCTOS_ANCHORS } from "@/modules/landing/ui/content/productos.content";
import { esencialPrice } from "./productos-price";

/**
 * #precio — «Lo que cuesta. Sin letra pequeña.» (plan productos_tinta §4.6).
 * El precio de Esencial sale del catálogo público que carga la página (ISR de
 * 60 s): si cambia en /platform, cambia aquí. Sin catálogo no hay cifra: la
 * columna queda con su enlace a los planes.
 */
export function ProductosPrice({ catalog, now }: { catalog: PublicCatalog | null; now: Date }) {
  const price = esencialPrice(catalog, now);
  return (
    <section id={PRODUCTOS_ANCHORS.price} aria-labelledby="precio-title" className="pj-band pj-price">
      <div className="pj-wrap">
        <h2 id="precio-title" className="pj-h pj-h-lg">
          {PRICE.strong} <span className="t">{PRICE.thin}</span>
        </h2>
        <div className="pj-price-box">
          <div>
            <p className="pj-price-label">{PRICE.advisor.label}</p>
            <p className="pj-price-n t">{PRICE.advisor.value}</p>
            <p className="pj-price-note">{PRICE.advisor.note}</p>
          </div>
          <div>
            <p className="pj-price-label">{PRICE.plan.label}</p>
            {price ? (
              <>
                <p className="pj-price-n" data-testid="precio-esencial">{formatCop(price.monthlyCop)}</p>
                {price.listCop !== null ? (
                  <p className="pj-price-was">
                    <s>{formatCop(price.listCop)}</s> {PRICE.plan.founder}
                  </p>
                ) : null}
                <p className="pj-price-note">{PRICE.plan.note(price.volumeLabel)}</p>
              </>
            ) : (
              <p className="pj-price-note">{PRICE.plan.empty}</p>
            )}
            <Link href={PRICE.plan.cta.href} className="pj-btn-ink mt-6">
              {PRICE.plan.cta.label}
            </Link>
          </div>
          <ul className="pj-price-list">
            {PRICE.bullets.map((b) => (
              <li key={b}>
                <Check className="mt-0.5 size-4 flex-none" strokeWidth={2.2} aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="pj-dim mt-4 text-[12px]">{PRICE.source}</p>
      </div>
    </section>
  );
}
