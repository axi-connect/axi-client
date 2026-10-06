import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { WA_MESSAGES } from "@/modules/landing/ui/content/landing.content";
import { PRODUCTOS_ANCHORS, PRODUCTOS_CLOSE, PRODUCTOS_TRIAL } from "@/modules/landing/ui/content/productos.content";

/**
 * #empezar — la ruta de 7 días (RouteLine: recorrido y lo que falta) y un solo
 * CTA. Monocroma: «Hoy» en coral porque es la acción. Cada paso responde la
 * duda de quien ya decidió (plan productos_tinta §4.8), en lugar de una FAQ
 * que repetía la de la home.
 */
export function ProductosClose() {
  return (
    <section id={PRODUCTOS_ANCHORS.close} aria-labelledby="empezar-title" className="pj-band pj-close">
      <div className="pj-glow" aria-hidden="true" />
      <h2 id="empezar-title" className="pj-h pj-h-xl relative z-[1]">
        <span className="block">{PRODUCTOS_CLOSE.strong}</span>{" "}
        <span className="t block">{PRODUCTOS_CLOSE.thin}</span>
      </h2>
      <ol className="pj-route m-0 list-none p-0">
        {PRODUCTOS_CLOSE.route.map((stop) => (
          <li key={stop.day} className="pj-stop">
            <span className="pj-stop-dot" aria-hidden="true" />
            <span className="pj-stop-day">{stop.day}</span>
            <span className="pj-stop-label">{stop.label}</span>
            <span className="pj-stop-detail">{stop.detail}</span>
          </li>
        ))}
      </ol>
      <div className="relative z-[1] flex flex-col items-center gap-4">
        <Link href={PRODUCTOS_TRIAL.href} prefetch={false} className="pj-cta h-[60px] px-[34px] text-[17px]">
          {PRODUCTOS_TRIAL.label} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <p className="pj-dim m-0 text-[13.5px]">{PRODUCTOS_CLOSE.micro}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-x-7 gap-y-2">
          <Link href={PRODUCTOS_CLOSE.pricing.href} className="pj-link text-sm">{PRODUCTOS_CLOSE.pricing.label}</Link>
          <a href={salesWhatsAppUrl(WA_MESSAGES.finalCta)} target="_blank" rel="noopener noreferrer" className="pj-link text-sm">
            <MessageCircle className="size-4" aria-hidden="true" />
            {PRODUCTOS_CLOSE.agent}
          </a>
          <Link href={PRODUCTOS_CLOSE.more.href} className="pj-link pj-dim text-sm">{PRODUCTOS_CLOSE.more.label}</Link>
        </div>
      </div>
    </section>
  );
}
