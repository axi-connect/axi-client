import Link from "next/link";
import { Lock, Play } from "lucide-react";

import { PRODUCTOS_ANCHORS, PRODUCTOS_HERO, PRODUCTOS_TRIAL } from "@/modules/landing/ui/content/productos.content";

/** Las siete habilidades por descubrir, en arco sobre el teléfono (x, y en px desde el centro). */
const ORBS = [
  [-250, 34], [-212, -40], [-130, -96], [0, -122], [130, -96], [212, -40], [250, 34],
] as const;

/**
 * #inicio — «Escríbele. / Mira cómo vende.» Server Component: llega completo
 * en el HTML. El arco de esferas promete las siete habilidades del juego; el
 * teléfono que asoma desde la luz es el mismo del juego (vuela con el scroll).
 */
export function ProductosOpening() {
  return (
    <section id={PRODUCTOS_ANCHORS.hero} aria-labelledby="inicio-title" className="pj-scene pj-opening">
      <div className="pj-sun" aria-hidden="true" />
      <h1 id="inicio-title" className="pj-h pj-h-xl relative z-[2]">
        <span className="block">{PRODUCTOS_HERO.strong}</span>
        <span className="t block">{PRODUCTOS_HERO.thin}</span>
      </h1>
      <p className="pj-lead relative z-[2] max-w-[30rem]">{PRODUCTOS_HERO.lead}</p>
      <div className="relative z-[2] flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <a href={PRODUCTOS_HERO.play.href} className="pj-cta">
          <Play className="size-3.5" fill="currentColor" aria-hidden="true" />
          {PRODUCTOS_HERO.play.label}
        </a>
        <Link href={PRODUCTOS_TRIAL.href} prefetch={false} className="pj-link">
          {PRODUCTOS_TRIAL.label} →
        </Link>
      </div>

      <div className="pj-orbs max-md:hidden" aria-hidden="true">
        {ORBS.map(([x, y], i) => (
          <span key={i} className="pj-orb" style={{ transform: `translate(${x}px, ${y}px)` }}>
            <Lock className="size-4" />
          </span>
        ))}
      </div>

      {/* El teléfono no vive aquí: es el del juego, que asoma desde esta luz y
          sube con el scroll hasta su sitio (usePhoneFlight). */}
    </section>
  );
}
