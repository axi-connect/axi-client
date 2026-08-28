"use client";

import { useCallback, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  BadgeCheck,
  BadgePercent,
  CalendarClock,
  Calculator,
  ContactRound,
  CreditCard,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { easeOut, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { scrollReveal } from "@/core/styles/motion";
import { DeviceChat } from "@/modules/landing/ui/components/mockups/DeviceChat";
import { KineticWords, type ScrollProgress } from "@/modules/landing/ui/components/KineticWords";
import { useScrollContainer } from "@/modules/landing/ui/components/use-scroll-container";
import { AGENT_DEMO, AGENT_REVEAL, type DemoBeat } from "@/modules/landing/ui/content/productos.content";

/**
 * §2 `#agente` — la demo en vivo. Una sección alta cuyo hijo sticky queda
 * clavado al viewport mientras el progreso de scroll (coreografía en
 * `motion.ts → scrollReveal`) revela, en orden: el titular palabra a palabra,
 * el dispositivo entrando en «Lift & Scale», y la conversación completa a
 * razón de un mensaje por paso de scroll.
 *
 * A la izquierda, el foco de capacidad nombra lo que el mensaje recién
 * entrado acaba de demostrar: la escena no explica el producto, lo enseña
 * funcionando y le pone nombre a cada cosa.
 *
 * Sticky funciona contra el scroller `[data-app-scroll]` porque ningún
 * ancestro intermedio tiene overflow/transform — NO añadir `overflow-hidden`
 * a los wrappers de esta sección (el recorte vive en el hijo sticky).
 *
 * Con reduced-motion —o hasta hidratar— la escena colapsa a su estado final
 * estático (conversación completa) sin viewports muertos.
 */
export default function ProductosAgentReveal() {
  const reduced = useReducedMotion();
  const { containerRef, ready } = useScrollContainer();

  if (reduced || !ready) {
    return (
      <RevealShell tall={false}>
        <div className="mx-auto grid w-full max-w-[1220px] items-center gap-10 px-6 py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <RevealHeading>{AGENT_REVEAL.title}</RevealHeading>
            <p className="text-muted-foreground mt-4 max-w-[42ch] text-pretty">{AGENT_REVEAL.sub}</p>
            <FocusCard beat={AGENT_DEMO.beats[AGENT_DEMO.beats.length - 1]} />
            <ProgressRail done={AGENT_DEMO.beats.length} />
          </div>
          <div className="flex justify-center">
            <Demo visibleUpTo={AGENT_DEMO.messages.length} />
          </div>
        </div>
      </RevealShell>
    );
  }
  return <AgentDemoAnimated containerRef={containerRef} />;
}

function AgentDemoAnimated({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const trackRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    container: containerRef as RefObject<HTMLElement>,
    offset: [...scrollReveal.offset],
    layoutEffect: false,
  });
  const progress = scrollYProgress as ScrollProgress;

  const subOpacity = useTransform(progress, [scrollReveal.sub.from, scrollReveal.sub.to], [0, 1]);

  /* «Lift & Scale» + enderezado en perspectiva: el dispositivo sube desde
     abajo creciendo, aclarándose y girando hasta ponerse de frente. */
  const { media } = scrollReveal;
  const mediaRange = [media.from, media.to];
  const y = useTransform(progress, mediaRange, [`${media.liftPct}%`, "0%"], { ease: easeOut });
  const scale = useTransform(progress, mediaRange, [media.scaleFrom, 1], { ease: easeOut });
  const rotateY = useTransform(progress, mediaRange, [media.rotateFrom, 0], { ease: easeOut });
  const deviceOpacity = useTransform(progress, mediaRange, [media.opacityFrom, 1], { ease: easeOut });

  /**
   * Cuántos mensajes se ven. Se calcula por UMBRAL con `useMotionValueEvent`,
   * no en cada frame: son doce `setState` en toda la escena en vez de uno por
   * frame de scroll.
   */
  const [visible, setVisible] = useState(0);
  const onProgress = useCallback((value: number) => {
    const { from, step, span } = scrollReveal.messages;
    let count = 0;
    for (let i = 0; i < AGENT_DEMO.messages.length; i += 1) {
      if (value >= from + i * step + span / 2) count = i + 1;
    }
    setVisible((current) => (current === count ? current : count));
  }, []);
  useMotionValueEvent(scrollYProgress, "change", onProgress);

  /* El beat activo es el último cuyo mensaje ya entró. */
  const beat =
    [...AGENT_DEMO.beats].reverse().find((item) => item.atMessage <= visible - 1) ?? null;

  return (
    <RevealShell tall ref={trackRef}>
      {/* pt-28: el SiteHeader (glass, pegado arriba) mide ~72px + margen — sin
          este padding el titular queda atrapado debajo del navbar al pinear. */}
      <div className="sticky top-0 flex h-svh overflow-hidden pt-28 pb-8 max-lg:pt-24">
        <SceneAmbient />
        <div className="relative z-10 mx-auto grid w-full max-w-[1220px] min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] items-center gap-6 px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[100%] lg:gap-12">
          <div className="min-w-0">
            <RevealHeading>
              <KineticWords
                text={AGENT_REVEAL.title}
                progress={progress}
                from={scrollReveal.title.from}
                step={scrollReveal.title.step}
                span={scrollReveal.title.span}
              />
            </RevealHeading>

            <motion.div style={{ opacity: subOpacity }}>
              <p className="text-muted-foreground mt-4 max-w-[42ch] text-pretty max-lg:text-sm">
                {AGENT_REVEAL.sub}
              </p>
              <FocusCard beat={beat} />
              <ProgressRail done={beat ? AGENT_DEMO.beats.indexOf(beat) + 1 : 0} />
            </motion.div>
          </div>

          {/* `perspective` en el escenario para que el giro del dispositivo
              tenga profundidad real y no lea como una imagen doblándose. */}
          <div
            className="flex min-h-0 items-center justify-center [perspective:1700px]"
            style={{ height: "100%" }}
          >
            <motion.div
              style={{ y, scale, rotateY, opacity: deviceOpacity }}
              className="flex h-full max-h-full items-center justify-center will-change-transform"
            >
              <Demo visibleUpTo={visible} />
            </motion.div>
          </div>
        </div>
      </div>
    </RevealShell>
  );
}

/* ───────────────────────────── piezas ───────────────────────────── */

function Demo({ visibleUpTo }: { visibleUpTo: number }) {
  return (
    <DeviceChat
      business={AGENT_DEMO.business}
      status={AGENT_DEMO.status}
      initials={AGENT_DEMO.initials}
      composerPlaceholder={AGENT_DEMO.composerPlaceholder}
      backLabel={AGENT_DEMO.backLabel}
      messages={AGENT_DEMO.messages}
      visibleUpTo={visibleUpTo}
    />
  );
}

function RevealShell({
  tall,
  ref,
  children,
}: {
  tall: boolean;
  ref?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <section
      ref={ref}
      id="agente"
      aria-label="El agente vendedor"
      className="dark theme-dark-island bg-background text-foreground relative w-full scroll-mt-24"
      style={tall ? { height: `${scrollReveal.trackVh}vh` } : undefined}
    >
      {children}
    </section>
  );
}

/**
 * Ambiente de la escena: elipses ancladas, nunca retículas — es el lenguaje
 * de superficie de la marca (DESIGN-SYSTEM §7).
 */
function SceneAmbient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(50% 40% at 12% 12%, color-mix(in srgb, var(--axi-brand) 8%, transparent), transparent 72%), radial-gradient(44% 62% at 76% 50%, color-mix(in srgb, var(--axi-brand) 13%, transparent), transparent 68%)",
      }}
    />
  );
}

function RevealHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-heading max-w-[15ch] text-2xl font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl [@media(min-height:800px)_and_(min-width:1024px)]:text-[2.75rem]">
      {children}
    </h2>
  );
}

const BEAT_ICONS: Record<DemoBeat["icon"], LucideIcon> = {
  catalog: ImageIcon,
  quote: Calculator,
  promo: BadgePercent,
  order: CreditCard,
  payment: BadgeCheck,
  crm: ContactRound,
  agenda: CalendarClock,
};

/**
 * Lo que el mensaje recién entrado acaba de demostrar. Antes del primer beat
 * muestra el rótulo de introducción, así la tarjeta nunca aparece vacía ni
 * cambia de alto al llegar el primero.
 */
function FocusCard({ beat }: { beat: DemoBeat | null }) {
  const Icon = beat ? BEAT_ICONS[beat.icon] : ImageIcon;
  return (
    <div
      aria-live="polite"
      className="border-border bg-secondary shadow-float mt-6 flex max-w-[420px] items-start gap-3.5 rounded-2xl border p-4 max-lg:mt-4"
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-300",
          beat ? "bg-accent text-brand" : "bg-input text-muted-foreground",
        )}
      >
        <Icon aria-hidden className="size-[17px]" />
      </span>
      {/* `key` fuerza el remonte para que la entrada se reproduzca en cada
          cambio de beat — es lo que hace legible que algo cambió. */}
      <span key={beat?.id ?? "intro"} className="animate-msg-in min-w-0">
        <span className="block text-[15px] leading-tight font-semibold">
          {beat ? beat.title : AGENT_REVEAL.introTitle}
        </span>
        <span className="text-muted-foreground mt-1 block text-[13px] leading-relaxed">
          {beat ? beat.body : AGENT_REVEAL.introBody}
        </span>
      </span>
    </div>
  );
}

/** Riel de progreso: un segmento por capacidad demostrada. */
function ProgressRail({ done }: { done: number }) {
  const total = AGENT_DEMO.beats.length;
  return (
    <div className="mt-4 flex max-w-[420px] items-center gap-3">
      <span aria-hidden className="flex flex-1 gap-1.5">
        {AGENT_DEMO.beats.map((item, index) => (
          <span
            key={item.id}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-300",
              index < done ? "bg-brand" : "bg-input",
            )}
          />
        ))}
      </span>
      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
        {AGENT_REVEAL.progressLabel(done, total)}
      </span>
    </div>
  );
}
