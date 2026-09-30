import { MessageCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { FILM_CONTENT, HERO_BUBBLES } from "@/modules/landing/domain/film/film-content";
import { FILM_NICHES } from "@/modules/landing/domain/film/niches";
import { WA_MESSAGES } from "@/modules/landing/ui/content/landing.content";
import { FilmCta } from "@/modules/landing/ui/film/parts/FilmCta";
import { FILM_ICONS } from "@/modules/landing/ui/film/parts/film-icons";
import { NicheChoice } from "@/modules/landing/ui/film/parts/NicheChoice";
import { Ribbon } from "@/modules/landing/ui/film/parts/Ribbon";

/** El enlace secundario a WhatsApp, igual en la apertura y en el cierre. */
function TalkToAgent({ className }: { className?: string }) {
  return (
    <a
      href={salesWhatsAppUrl(WA_MESSAGES.hero)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-[54px] items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_16%,transparent)] px-6 text-base font-semibold whitespace-nowrap",
        "bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <MessageCircle className="size-[18px]" aria-hidden="true" />
      Habla con nuestro agente
    </a>
  );
}

/** Posición de cada burbuja alrededor de la α, en % de su caja. La profundidad decide blur y parallax. */
const BUBBLE_SPOTS = [
  "left-[-6%] top-[2%]",
  "right-[-18%] top-[14%]",
  "left-[-22%] top-[66%]",
  "right-[-14%] top-[76%]",
  "left-[18%] top-[98%]",
] as const;
const DEPTH = ["", "blur-[1px] opacity-80", "blur-[2px] opacity-55", "blur-[3px] opacity-35"] as const;

export function HeroScene() {
  return (
    <section id="hero" data-scene="hero" aria-label="Axi Connect" className="film-scene">
      <div className="film-spot top-[4%] left-[48%] size-[1000px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_14%,transparent),transparent)]" />
      <div className="film-spot top-[-10%] left-[66%] size-[700px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-violet)_10%,transparent),transparent)]" />
      <Ribbon d="M 1030 600 C 1040 720, 900 800, 720 860 S 320 940, 120 1000" className="max-lg:hidden" />

      <div className="film-wrap grid items-center gap-12 pt-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:pt-24">
        <div data-anim="copy" className="max-lg:order-2">
          <p className="film-chip mb-7">
            <MessageCircle className="size-3.5 text-[var(--axi-success)]" aria-hidden="true" />
            Agentes de IA que venden por WhatsApp
          </p>
          <h1 className="film-h text-[clamp(44px,6.6vw,96px)]">
            <span className="t">Vende en</span>
            <br />
            cada conversación.
          </h1>
          <p className="film-lead mt-7 max-w-[34rem] text-[clamp(15.5px,1.35vw,19px)] leading-relaxed">
            Axi atiende tu WhatsApp como tu mejor vendedor: responde en segundos, cotiza con tus precios, cobra y te lleva a
            tu meta del mes.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <FilmCta>Prueba 7 días gratis</FilmCta>
            <TalkToAgent />
          </div>
          <p className="film-dim mt-4 text-[13.5px]">Sin tarjeta. Tu cuenta queda lista hoy.</p>
        </div>

        <div className="relative mx-auto aspect-square w-[min(56vw,400px)] max-lg:order-1 max-lg:w-[min(48vw,230px)]" aria-hidden="true">
          <div className="absolute inset-[-20%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_30%,transparent),color-mix(in_srgb,var(--axi-violet)_16%,transparent)_55%,transparent_75%)] blur-2xl" />
          <BrandMark className="film-alpha relative size-full" data-anim="alpha" />
          {HERO_BUBBLES.map((b, i) => (
            <div
              key={b.text}
              data-anim="bubble"
              data-depth={b.depth}
              className={cn("absolute", BUBBLE_SPOTS[i], DEPTH[b.depth], b.depth >= 2 && "max-lg:hidden")}
            >
              <div className="film-bub film-bub-in max-w-none text-sm whitespace-nowrap shadow-[0_18px_40px_rgb(0_0_0/.45)]">{b.text}</div>
              <div className="film-meta">{b.meta}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="film-dim absolute bottom-8 left-[clamp(16px,7vw,132px)] z-[2] flex items-center gap-3 text-[12.5px] max-lg:hidden" aria-hidden="true">
        <span className="block h-9 w-px bg-[linear-gradient(transparent,var(--foreground))]" />
        Baja y míralo vender
      </div>
    </section>
  );
}

export function NicheScene() {
  return (
    <section id="quien" data-scene="niche" aria-labelledby="quien-h" className="film-scene">
      <div className="film-spot top-[30%] left-[calc(50%-560px)] size-[1120px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_9%,transparent),transparent)]" />
      <Ribbon d="M -40 640 C 300 560, 520 720, 760 630 S 1180 560, 1500 610" />
      <div className="film-wrap text-center">
        <div data-anim="head">
          <p className="film-eyebrow mb-4 text-[var(--axi-brand)]">Empieza la película</p>
          <h2 id="quien-h" className="film-h text-[clamp(38px,5.2vw,76px)]">
            ¿Quién te <span className="t">escribe hoy?</span>
          </h2>
          <p className="film-lead mx-auto mt-4 max-w-xl text-[clamp(15px,1.3vw,17px)]">Elige y todo lo que sigue pasa en tu negocio.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-[1180px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5 max-lg:mt-8">
          {FILM_NICHES.map((niche) => {
            const c = FILM_CONTENT[niche];
            const Icon = FILM_ICONS[c.icon];
            return (
              <NicheChoice key={niche} niche={niche} className="min-h-[200px] max-lg:min-h-0 max-lg:gap-4 max-lg:p-4">
                <span className="film-bub film-bub-in max-w-none text-[15px] max-lg:text-[13.5px]">{c.ask}</span>
                <span className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold">{c.label}</span>
                    <span className="film-dim block text-[12.5px]">Un cliente te escribe</span>
                  </span>
                </span>
              </NicheChoice>
            );
          })}
        </div>
        <p className="film-dim mt-8 text-[13px]">O sigue bajando: te mostramos un negocio de ejemplo.</p>
      </div>
    </section>
  );
}

export function CloseScene() {
  return (
    <section id="demo" data-scene="close" aria-labelledby="cierre-h" className="film-scene">
      <div className="film-spot top-[2%] left-[calc(50%-500px)] size-[1000px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_16%,transparent),transparent)]" />
      <Ribbon d="M -40 150 C 300 170, 500 330, 660 380" className="max-lg:hidden" />
      <Ribbon d="M 1480 150 C 1140 170, 940 330, 780 380" className="max-lg:hidden" />
      <div className="film-wrap text-center">
        <div className="relative mx-auto mb-10 aspect-square w-[min(40vw,220px)]" aria-hidden="true" data-anim="alpha-close">
          <div className="absolute inset-[-20%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_30%,transparent),color-mix(in_srgb,var(--axi-violet)_16%,transparent)_55%,transparent_75%)] blur-2xl" />
          <BrandMark className="relative size-full" />
        </div>
        <h2 id="cierre-h" className="film-h text-[clamp(38px,5.4vw,78px)]">
          Tu próxima venta <span className="t">ya está escribiendo.</span>
        </h2>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <FilmCta>Prueba 7 días gratis</FilmCta>
          <TalkToAgent />
        </div>
        <p className="film-dim mt-4 text-[13.5px]">Sin tarjeta. Tu cuenta queda lista hoy.</p>
      </div>
    </section>
  );
}
