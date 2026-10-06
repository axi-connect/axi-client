import Link from "next/link";
import { Play } from "lucide-react";

import { PRODUCTOS_ANCHORS, PRODUCTOS_HERO, PRODUCTOS_TRIAL } from "@/modules/landing/ui/content/productos.content";

/**
 * #inicio — «Escríbele. / Mira cómo vende.» Server Component: llega completo
 * en el HTML. Dice qué es Axi en una frase (plan productos_tinta §4.1). El
 * teléfono que asoma desde la luz es el mismo del juego (vuela con el scroll).
 */
export function ProductosOpening() {
  return (
    <section id={PRODUCTOS_ANCHORS.hero} aria-labelledby="inicio-title" className="pj-scene pj-opening">
      <h1 id="inicio-title" className="pj-h pj-h-xl relative z-[2]">
        <span className="block">{PRODUCTOS_HERO.strong}</span>{" "}
        <span className="t block">{PRODUCTOS_HERO.thin}</span>
      </h1>
      <p className="pj-lead relative z-[2] max-w-[36rem] text-pretty">{PRODUCTOS_HERO.lead}</p>
      <div className="relative z-[2] flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a href={PRODUCTOS_HERO.play.href} className="pj-cta">
          <Play className="size-3.5" fill="currentColor" aria-hidden="true" />
          {PRODUCTOS_HERO.play.label}
        </a>
        <Link href={PRODUCTOS_TRIAL.href} prefetch={false} className="pj-link">
          {PRODUCTOS_TRIAL.label}
        </Link>
      </div>

      {/* El teléfono no vive aquí: es el del juego, que asoma desde la luz
          compartida y sube con el scroll (usePhoneFlight). */}
    </section>
  );
}
