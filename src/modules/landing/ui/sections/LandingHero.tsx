"use client";

import { motion, useReducedMotion } from "framer-motion";

import { salesWhatsAppUrl } from "@/core/config/env";
import { fade } from "@/core/styles/motion";
import { Button } from "@/shared/components/ui/button";
import { BrandGradientCanvas } from "@/modules/landing/ui/components/BrandGradientCanvas";
import { ParallaxLayer } from "@/modules/landing/ui/components/ParallaxLayer";
import { AgentMascot } from "@/modules/landing/ui/components/mockups/AgentMascot";
import { ChatConversation } from "@/modules/landing/ui/components/mockups/ChatConversation";
import { SalePaidCard } from "@/modules/landing/ui/components/mockups/SalePaidCard";
import {
  HERO,
  HERO_CHAT,
  LANDING_ANCHORS,
  WA_MESSAGES,
} from "@/modules/landing/ui/content/landing.content";

/**
 * §1 Hero — el único momento de gradiente tricolor junto al CTA final.
 * El producto es la imagen: conversación real cotizando y cerrando, con la
 * tarjeta "Venta pagada" como remate y Lumo (el agente) flotando al lado.
 */
export default function LandingHero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative w-full overflow-hidden">
      {/* Fondo: glow estático de respaldo + gradiente de marca "con vida" */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[640px] blur-2xl"
        style={{
          background:
            "radial-gradient(60% 70% at 18% 18%, color-mix(in srgb, var(--axi-brand) 22%, transparent), transparent 70%), radial-gradient(50% 60% at 82% 8%, color-mix(in srgb, var(--axi-violet) 18%, transparent), transparent 70%), radial-gradient(45% 55% at 60% 80%, color-mix(in srgb, var(--axi-amber) 12%, transparent), transparent 70%)",
        }}
      />
      <BrandGradientCanvas className="absolute inset-0 h-full w-full" speed={1} grain={0.6} opacity={0.55} />

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-14 px-6 pt-24 pb-20 sm:px-7 md:pt-32 md:pb-28 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* Columna de mensaje */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade.slow}
        >
          {/* <p className="border-border bg-secondary/60 text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px]">
            {HERO.kicker}
          </p> */}
          <h1 className="font-heading text-2xl leading-[1.06] font-bold tracking-tight text-balance sm:text-5xl lg:text-[62px]">
            {HERO.headline}
            <br />
            {/* <span className="font-heading text-2xl leading-[1.06] font-bold tracking-tight text-balance sm:text-5xl lg:text-[62px]">{HERO.headlineGradient}</span> */}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-[610px] text-[17px] leading-relaxed text-pretty">
            {HERO.subheadline}
          </p>
          <div className="mt-8 flex flex-wrap gap-3.5">
            <Button
              asChild
              size="lg"
              className="h-12 px-7 text-base shadow-[0_14px_40px_color-mix(in_srgb,var(--axi-brand)_40%,transparent)]"
            >
              <a href={`#${LANDING_ANCHORS.demo}`}>{HERO.ctaPrimary}</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base backdrop-blur-sm">
              <a href={salesWhatsAppUrl(WA_MESSAGES.hero)} target="_blank" rel="noopener noreferrer">
                {HERO.ctaSecondary}
              </a>
            </Button>
          </div>
          <p className="text-muted-foreground/80 mt-4 text-[13.5px]">{HERO.microcopy}</p>
        </motion.div>

        {/* Columna producto: chat + venta pagada + Lumo */}
        <div className="relative mx-auto w-full max-w-[520px] pb-14 lg:max-w-none">
          <div className="animate-hero-float relative">
            <AgentMascot
              variant="lumo"
              width={210}
              priority
              className="absolute -bottom-10 -left-6 z-[2] max-lg:w-36 sm:-left-14 lg:-left-24"
            />
            <ChatConversation
              businessName={HERO_CHAT.businessName}
              status={HERO_CHAT.status}
              messages={HERO_CHAT.messages}
              mode="autoplay"
            />
            <ParallaxLayer strength={0.1} className="absolute -right-2 -bottom-12 z-[3] sm:-right-5">
              <SalePaidCard card={HERO_CHAT.saleCard} />
            </ParallaxLayer>
          </div>
        </div>
      </div>
    </section>
  );
}
