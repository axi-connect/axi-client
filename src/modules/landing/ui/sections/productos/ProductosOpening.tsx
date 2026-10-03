import Image from "next/image";
import Link from "next/link";
import { Lock, Play } from "lucide-react";

import { GAME, PRODUCTOS_ANCHORS, PRODUCTOS_HERO, PRODUCTOS_TRIAL } from "@/modules/landing/ui/content/productos.content";

/** Las siete habilidades por descubrir, en arco sobre el teléfono (x, y en px desde el centro). */
const ORBS = [
  [-316, 10], [-268, -80], [-180, -146], [0, -176], [180, -146], [268, -80], [316, 10],
] as const;

/**
 * #inicio — «Escríbele. / Mira cómo vende.» Server Component: llega completo
 * en el HTML. El teléfono asoma desde el sol del hero de la home y el arco de
 * esferas promete las siete habilidades del juego.
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

      <div aria-hidden="true" className="pj-device pj-opening-phone relative z-[1]">
        <div className="pj-screen">
          <div className="flex items-center gap-2.5 border-b border-[var(--pj-line)] pb-2.5">
            <Image src={GAME.avatar.src} alt="" width={28} height={28} className="size-7 rounded-full bg-white" />
            <span className="text-[13px] font-semibold">{GAME.business}</span>
            <span className="text-[10.5px] text-[var(--axi-success)]">{GAME.online}</span>
          </div>
          <div className="pj-bubble self-end text-left" data-from="agent">{PRODUCTOS_HERO.greeting}</div>
        </div>
      </div>
    </section>
  );
}
