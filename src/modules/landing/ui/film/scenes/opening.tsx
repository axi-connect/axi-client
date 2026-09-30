import { ArrowRight, MessageCircle } from "lucide-react";
import { FaFacebookMessenger, FaInstagram, FaWhatsapp } from "react-icons/fa6";

import { salesWhatsAppUrl } from "@/core/config/env";
import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { FILM_CONTENT } from "@/modules/landing/domain/film/film-content";
import { FILM_NICHES } from "@/modules/landing/domain/film/niches";
import { WA_MESSAGES } from "@/modules/landing/ui/content/landing.content";
import { FilmCta } from "@/modules/landing/ui/film/parts/FilmCta";
import { HeroSky } from "@/modules/landing/ui/film/parts/HeroSky";
import { HeroStats } from "@/modules/landing/ui/film/parts/HeroStats";
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

/** Los canales por los que escriben los clientes: la fila de confianza del hero. */
const CHANNELS = [
  { Icon: FaWhatsapp, label: "WhatsApp" },
  { Icon: FaInstagram, label: "Instagram" },
  { Icon: FaFacebookMessenger, label: "Messenger" },
] as const;

/**
 * El hero: un solo pantallazo sobre un atardecer de dunas del que sube un cielo
 * de conversaciones (HeroSky). Referencia aprobada el 2026-09-30, adaptada a la
 * marca: titular en Nexa, CTA coral, canales en vez de logos de empresas y
 * cifras que son hechos del producto. La cinta de luz nace de las crestas y
 * baja con el scroll hacia la escena siguiente.
 */
export function HeroScene() {
  return (
    <section id="hero" data-scene="hero" aria-label="Axi Connect" className="relative flex h-[100svh] min-h-[640px] w-full flex-col overflow-clip">
      <HeroSky className="absolute inset-0 size-full" />
      <Ribbon d="M 720 700 C 716 790, 728 860, 720 960" axis="x" spread={6} className="z-[1]" />

      <div className="relative z-[2] flex flex-1 flex-col items-center px-4 pt-[clamp(96px,14vh,132px)] pb-[clamp(18px,3vh,32px)]">
        <div data-anim="copy" className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="film-in mb-[clamp(16px,2.5vh,26px)] inline-flex items-center" style={{ "--d": "0.05s" } as React.CSSProperties}>
            {CHANNELS.map(({ Icon, label }, i) => (
              <span
                key={label}
                className="film-ring grid size-[var(--ring)] place-items-center rounded-full border border-[color-mix(in_srgb,var(--foreground)_40%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_14%,var(--background))] p-[5px]"
                style={{ zIndex: i === 2 ? 4 : i + 1, marginLeft: i ? "calc(var(--ring) * -0.42)" : undefined }}
              >
                <span className="grid size-full place-items-center rounded-full bg-foreground text-background">
                  <Icon className="size-[calc(var(--ring)*0.34)]" aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </span>
              </span>
            ))}
            <span className="-ml-[calc(var(--ring)*0.42)] inline-flex h-[var(--ring)] items-center rounded-full border border-[color-mix(in_srgb,var(--foreground)_40%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_14%,var(--background))] pr-4 pl-[calc(var(--ring)*0.58)] text-[clamp(12px,1.4vw,13.5px)] font-medium text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]">
              Tus clientes ya te escriben aquí
            </span>
          </div>

          <h1 className="film-h text-[clamp(40px,6.4vw,88px)] leading-[1.05]">
            <span className="film-line block t" style={{ "--d": "0.12s" } as React.CSSProperties}>
              Vende en
            </span>
            <span className="film-line block" style={{ "--d": "0.3s" } as React.CSSProperties}>
              cada conversación.
            </span>
          </h1>

          <p className="film-in mt-[clamp(14px,2.4vh,22px)] max-w-[min(540px,92%)] text-[clamp(15px,1.55vw,19px)] leading-[1.55] text-[color-mix(in_srgb,var(--foreground)_78%,transparent)]" style={{ "--d": "0.28s" } as React.CSSProperties}>
            Axi atiende tu WhatsApp como tu mejor vendedor: responde en segundos, cotiza con tus precios, cobra y te lleva
            a tu meta del mes.
          </p>

          <div className="film-in mt-[clamp(18px,3vh,30px)] flex flex-wrap items-center justify-center gap-x-6 gap-y-3" style={{ "--d": "0.4s" } as React.CSSProperties}>
            <FilmCta className="film-glow h-auto rounded-full px-[clamp(22px,3vw,30px)] py-[clamp(12px,1.7vh,14px)] text-[clamp(14px,1.5vw,15.5px)]">
              Prueba 7 días gratis
            </FilmCta>
            <a
              href={salesWhatsAppUrl(WA_MESSAGES.hero)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-[color-mix(in_srgb,var(--foreground)_80%,transparent)] transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Habla con nuestro agente
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>
          <p className="film-in film-dim mt-3 text-[12.5px]" style={{ "--d": "0.46s" } as React.CSSProperties}>
            Sin tarjeta. Tu cuenta queda lista hoy.
          </p>
        </div>

        <div data-anim="stats" className="w-full max-w-[920px] shrink-0">
          <HeroStats />
        </div>
      </div>
    </section>
  );
}

export function NicheScene() {
  return (
    <section id="quien" data-scene="niche" aria-labelledby="quien-h" className="film-scene">
      <div className="film-spot top-[30%] left-[calc(50%-560px)] size-[1120px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_9%,transparent),transparent)]" />
      <Ribbon d="M 720 -40 C 760 80, 1360 90, 1400 330 S 1120 610, 760 640 S 220 570, -40 650" />
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
