import { ArrowRight, MessageCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { FILM_CONTENT } from "@/modules/landing/domain/film/film-content";
import { FILM_NICHES } from "@/modules/landing/domain/film/niches";
import { WA_MESSAGES } from "@/modules/landing/ui/content/landing.content";
import { FilmCta } from "@/modules/landing/ui/film/parts/FilmCta";
import { HeroFibersLazy } from "@/modules/landing/ui/film/parts/HeroFibersLazy";
import { HeroStats } from "@/modules/landing/ui/film/parts/HeroStats";
import { NicheChoice } from "@/modules/landing/ui/film/parts/NicheChoice";

/**
 * El hero A, «Mil conversaciones, un hilo» (plan §14, elegido por la dueña el
 * 2026-09-30): sobre tinta, las conversaciones entran por los bordes como fibras
 * (`HeroFibers`, diferido) y convergen en un nudo bajo el CTA, donde se
 * enciende la marca. El titular, el texto, los CTA y las cifras no cambian.
 *
 * Las posiciones van en % del alto (titular al 19 %, nudo al 68 %, cifras al
 * 87 %). El nudo cae sobre la primera ancla del hilo de luz (`thread-path`),
 * archivado por ahora (plan §15): si vuelve, nace ahí.
 */
export function HeroScene() {
  return (
    <section
      id="hero"
      data-scene="hero"
      aria-label="Axi Connect"
      className="relative h-[100svh] min-h-[640px] w-full overflow-x-clip max-lg:min-h-[740px]"
    >
      <div className="film-hero-halo" data-anim="halo" aria-hidden="true" />
      <HeroFibersLazy className="film-hero-fibers pointer-events-none absolute inset-0 size-full" />

      <div data-anim="copy" className="film-hero-copy z-[2]">
        <h1 className="film-h text-[clamp(46px,7.2vw,104px)] leading-[0.98] tracking-[-0.045em]">
          <span className="film-line block" style={{ "--d": "0.12s" } as React.CSSProperties}>
            Vende en
          </span>
          <span className="film-line t block" style={{ "--d": "0.3s" } as React.CSSProperties}>
            cada conversación.
          </span>
        </h1>

        <p
          className="film-in mx-auto mt-[clamp(16px,2.6vh,26px)] max-w-[min(540px,100%)] text-[clamp(15px,1.3vw,18px)] leading-[1.6] text-[color-mix(in_srgb,var(--foreground)_64%,transparent)]"
          style={{ "--d": "0.28s" } as React.CSSProperties}
        >
          Axi atiende tu WhatsApp como tu mejor vendedor: responde en segundos, cotiza con tus precios, cobra y te lleva
          a tu meta del mes.
        </p>

        <div
          className="film-in mt-[clamp(18px,3vh,30px)] flex flex-wrap items-center justify-center gap-x-[26px] gap-y-3"
          style={{ "--d": "0.4s" } as React.CSSProperties}
        >
          <FilmCta className="film-glow h-auto rounded-full px-[clamp(22px,3vw,30px)] py-[clamp(12px,1.7vh,15px)] text-[clamp(14px,1.5vw,15.5px)]">
            Prueba 7 días gratis
          </FilmCta>
          <a
            href={salesWhatsAppUrl(WA_MESSAGES.hero)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-[color-mix(in_srgb,var(--foreground)_78%,transparent)] transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Habla con nuestro agente
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
        </div>
        <p data-hero-fine="" className="film-in film-dim mt-3 text-[12.5px]" style={{ "--d": "0.46s" } as React.CSSProperties}>
          Sin tarjeta. Tu cuenta queda lista hoy.
        </p>
      </div>

      <div data-anim="stats" className="film-hero-stats z-[2]">
        <HeroStats />
      </div>
    </section>
  );
}

/** Las cuatro notificaciones en arco: inclinación y profundidad de cada una (lienzo §13). */
const NOTIF_POSE = [
  { tilt: 9, depth: -70 },
  { tilt: 3, depth: 0 },
  { tilt: -3, depth: 0 },
  { tilt: -9, depth: -70 },
] as const;

/**
 * «¿Quién te escribe hoy?» (plan §13, lienzo aprobado el 2026-09-30): cuatro
 * notificaciones llegan desde el fondo en arco; la del nicho activo (Tecnología
 * por defecto) viene al frente, se endereza y se vuelve blanca. Tocar otra
 * elige ese nicho.
 */
export function NicheScene() {
  return (
    <section id="quien" data-scene="niche" aria-labelledby="quien-h" className="film-scene">
      <div className="film-spot top-[29%] left-[calc(50%-450px)] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--foreground)_6%,transparent),transparent)]" />
      <div className="film-wrap film-wrap-wide text-center">
        <div data-anim="head">
          <p className="film-eyebrow film-dim mb-5">Empieza la película</p>
          <h2 id="quien-h" className="film-h text-[clamp(38px,5.3vw,76px)]">
            ¿Quién te <span className="t">escribe hoy?</span>
          </h2>
          <p className="film-lead mx-auto mt-5 max-w-[520px] text-[clamp(14.5px,1.3vw,18px)]">Elige y todo lo que sigue pasa en tu negocio.</p>
        </div>
        <div className="film-notifs mt-[clamp(32px,7vh,72px)]" data-anim="notifs">
          {FILM_NICHES.map((niche, i) => {
            const c = FILM_CONTENT[niche];
            return (
              <div key={niche} className="film-notif-in" data-anim="notif">
                <NicheChoice niche={niche} style={{ "--tilt": `${NOTIF_POSE[i].tilt}deg`, "--depth": `${NOTIF_POSE[i].depth}px` } as React.CSSProperties}>
                  <span className="relative flex items-center gap-2.5">
                    <span className="film-notif-icon" aria-hidden="true">
                      <MessageCircle className="size-4" />
                    </span>
                    <span className="text-[11.5px] font-semibold tracking-[0.02em] max-lg:text-[10px]">
                      WhatsApp<span className="lg:hidden"> · ahora</span>
                    </span>
                    <span className="film-notif-dim ml-auto text-[11px] max-lg:hidden">ahora</span>
                  </span>
                  <span className="relative text-[17px] leading-[1.4] font-medium text-balance max-lg:text-[13.5px] max-lg:leading-[1.35]">{c.ask}</span>
                  <span className="relative mt-auto flex flex-col gap-0.5">
                    <span className="text-[10.5px] font-semibold tracking-[0.16em] uppercase max-lg:text-[9.5px] max-lg:tracking-[0.14em]">{c.label}</span>
                    <span className="film-notif-dim text-xs max-lg:hidden">Le escribe a {c.business.split(" · ")[0]}</span>
                  </span>
                </NicheChoice>
              </div>
            );
          })}
        </div>
        <p className="film-dim mt-[clamp(28px,5vh,50px)] text-[13.5px] max-lg:text-left max-lg:text-[12.5px]" data-anim="niche-hint">
          O sigue bajando: te mostramos un negocio de ejemplo.
        </p>
      </div>
    </section>
  );
}
