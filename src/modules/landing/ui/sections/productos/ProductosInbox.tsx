import Image from "next/image";
import { ArrowLeftRight, Sparkles, Users } from "lucide-react";

import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { ParallaxLayer } from "@/modules/landing/ui/components/ParallaxLayer";
import { BrowserFrame } from "@/modules/landing/ui/components/mockups/BrowserFrame";
import { INBOX_SECTION, PRODUCT_SHOTS } from "@/modules/landing/ui/content/productos.content";

const FEATURE_ICONS = {
  handoff: ArrowLeftRight,
  unified: Users,
  context: Sparkles,
} as const;

/**
 * §4 `#inbox` — la captura REAL del inbox dentro del marco de navegador
 * (device frame premium), con el copy de handoff al lado. Una decoración con
 * parallax sutil; la captura es la protagonista.
 */
export default function ProductosInbox() {
  return (
    <section
      id="inbox"
      aria-label="Inbox y handoff"
      className="relative w-full scroll-mt-24 overflow-x-clip"
    >
      {/* Halo decorativo con deriva de parallax. */}
      <ParallaxLayer
        strength={0.12}
        className="pointer-events-none absolute -top-16 -right-24 -z-10 max-lg:hidden"
      >
        <div
          aria-hidden
          className="size-[340px] rounded-full blur-[110px]"
          style={{ background: "color-mix(in srgb, var(--axi-brand) 22%, transparent)" }}
        />
      </ParallaxLayer>

      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <SectionHeading
            kicker={INBOX_SECTION.kicker}
            title={INBOX_SECTION.title}
            intro={INBOX_SECTION.intro}
          />
          <ul className="mt-8 flex flex-col gap-5">
            {INBOX_SECTION.features.map((feature, i) => {
              const Icon = FEATURE_ICONS[feature.id as keyof typeof FEATURE_ICONS] ?? Sparkles;
              return (
                <li key={feature.id}>
                  <Reveal delay={i * 0.08} className="flex items-start gap-3.5">
                    <span className="bg-accent text-brand flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <Icon aria-hidden className="size-4.5" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.body}</p>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>

        <Reveal>
          <BrowserFrame url={INBOX_SECTION.browser.url} tab={INBOX_SECTION.browser.tab}>
            <div className="relative aspect-[16/10]">
              <Image
                src={PRODUCT_SHOTS.inbox.src}
                alt={PRODUCT_SHOTS.inbox.alt}
                fill
                sizes="(max-width: 1024px) 92vw, 660px"
                className="object-cover object-top"
              />
            </div>
          </BrowserFrame>
        </Reveal>
      </div>
    </section>
  );
}
