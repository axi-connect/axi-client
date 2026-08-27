"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import { easeOut, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { scrollReveal } from "@/core/styles/motion";
import { KineticWords, type ScrollProgress } from "@/modules/landing/ui/components/KineticWords";
import { useScrollContainer } from "@/modules/landing/ui/components/use-scroll-container";
import {
  AGENT_REVEAL,
  AGENT_TOOLS,
  PRODUCT_SHOTS,
} from "@/modules/landing/ui/content/productos.content";

/**
 * §2 `#agente` — la escena pineada: una sección alta cuyo hijo sticky queda
 * clavado al viewport mientras el progreso de scroll (coreografía en
 * `motion.ts → scrollReveal`) revela, en orden: el titular palabra a palabra,
 * el panel con la captura real de agentes entrando en «Lift & Scale» (opción A
 * del comparador — sube desde abajo creciendo, estilo página de producto de
 * Apple), y las 18 herramientas reales como pills.
 *
 * Sticky funciona contra el scroller `[data-app-scroll]` porque ningún
 * ancestro intermedio tiene overflow/transform — NO añadir `overflow-hidden`
 * a los wrappers de esta sección (el recorte vive en el hijo sticky).
 *
 * Con reduced-motion —o hasta hidratar— la escena colapsa a su estado final
 * estático sin viewport muertos.
 */
export default function ProductosAgentReveal() {
  const reduced = useReducedMotion();
  const { containerRef, ready } = useScrollContainer();

  if (reduced || !ready) {
    return (
      <RevealShell tall={false}>
        <div className="flex flex-col items-center gap-6 px-6 py-24 text-center">
          <RevealHeading>
            <span>{AGENT_REVEAL.title}</span>
          </RevealHeading>
          <p className="text-muted-foreground max-w-[52ch] text-pretty">{AGENT_REVEAL.sub}</p>
          <RevealMedia />
          <ToolPills />
        </div>
      </RevealShell>
    );
  }
  return <AgentRevealAnimated containerRef={containerRef} />;
}

function AgentRevealAnimated({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const trackRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    container: containerRef as RefObject<HTMLElement>,
    offset: [...scrollReveal.offset],
    layoutEffect: false,
  });
  const progress = scrollYProgress as ScrollProgress;

  const subOpacity = useTransform(progress, [scrollReveal.sub.from, scrollReveal.sub.to], [0, 1]);
  /* «Lift & Scale» (opción A): el panel sube desde abajo creciendo y
     aclarándose hasta reposar — easeOut para el aterrizaje suave de Apple. */
  const { media } = scrollReveal;
  const mediaRange = [media.from, media.to];
  const y = useTransform(progress, mediaRange, [`${media.liftPct}%`, "0%"], { ease: easeOut });
  const scale = useTransform(progress, mediaRange, [media.scaleFrom, 1], { ease: easeOut });
  const mediaOpacity = useTransform(progress, mediaRange, [media.opacityFrom, 1], {
    ease: easeOut,
  });

  return (
    <RevealShell tall ref={trackRef}>
      {/* pt-28: el SiteHeader (glass, pegado arriba) mide ~72px + margen — sin
          este padding el titular queda atrapado debajo del navbar al pinear. */}
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-8 text-center">
        <RevealHeading>
          <KineticWords
            text={AGENT_REVEAL.title}
            progress={progress}
            from={scrollReveal.title.from}
            step={scrollReveal.title.step}
            span={scrollReveal.title.span}
          />
        </RevealHeading>

        <motion.p
          style={{ opacity: subOpacity }}
          className="text-muted-foreground mt-4 max-w-[52ch] text-pretty"
        >
          {AGENT_REVEAL.sub}
        </motion.p>

        <div className="relative mt-8 w-full max-w-[1000px]">
          {/* Altura acotada al viewport (no aspect-ratio): con pills y titular
              en el mismo svh, un 16:9 completo desbordaba pantallas bajas. */}
          <motion.div
            style={{ y, scale, opacity: mediaOpacity }}
            className="border-border bg-card shadow-overlay relative h-[min(44svh,520px)] overflow-hidden rounded-[20px] border will-change-transform"
          >
            <RevealShot />
          </motion.div>
        </div>

        <ToolPills progress={progress} />
      </div>
    </RevealShell>
  );
}

/* ───────────────────────────── piezas ───────────────────────────── */

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

function RevealHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-heading max-w-[20ch] text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
      {children}
    </h2>
  );
}

/** Variante estática del medio (reduced-motion / pre-hidratación). */
function RevealMedia() {
  return (
    <div className="border-border bg-card relative aspect-[16/9.4] w-full max-w-[1000px] overflow-hidden rounded-[20px] border">
      <RevealShot />
    </div>
  );
}

function RevealShot() {
  return (
    <Image
      src={PRODUCT_SHOTS.agents.src}
      alt={PRODUCT_SHOTS.agents.alt}
      fill
      sizes="(max-width: 1024px) 92vw, 1000px"
      className="object-cover object-top"
    />
  );
}

/**
 * Las 18 herramientas. En la variante animada cada pill entra en su tramo del
 * progreso; sin `progress` (estático/reduced) se pintan visibles.
 */
function ToolPills({ progress }: { progress?: ScrollProgress }) {
  return (
    <ul className="mt-8 flex max-w-[880px] flex-wrap items-center justify-center gap-2">
      {AGENT_TOOLS.map((tool, i) =>
        progress ? (
          <AnimatedToolPill key={tool} progress={progress} index={i}>
            {tool}
          </AnimatedToolPill>
        ) : (
          <li key={tool} className={pillClass(i, false)}>
            <PillContent>{tool}</PillContent>
          </li>
        ),
      )}
      {progress ? (
        <AnimatedToolPill progress={progress} index={AGENT_TOOLS.length} total>
          {AGENT_REVEAL.toolsTotal}
        </AnimatedToolPill>
      ) : (
        <li className={pillClass(AGENT_TOOLS.length, true)}>{AGENT_REVEAL.toolsTotal}</li>
      )}
    </ul>
  );
}

function pillClass(index: number, total: boolean) {
  return cn(
    "rounded-full border px-3.5 py-1.5 font-mono text-xs will-change-transform",
    /* En móvil el viewport no da para 19 pills: se ve un subconjunto + total. */
    index >= 8 && !total && "max-md:hidden",
    total
      ? "border-accent-violet/35 bg-accent-violet/12 text-accent-violet font-medium"
      : "border-border bg-secondary/50 text-muted-foreground",
  );
}

function PillContent({ children }: { children: string }) {
  return (
    <>
      <span aria-hidden className="text-success mr-1.5 font-sans font-semibold">
        ✓
      </span>
      {children}
    </>
  );
}

function AnimatedToolPill({
  progress,
  index,
  total = false,
  children,
}: {
  progress: ScrollProgress;
  index: number;
  total?: boolean;
  children: string;
}) {
  const from = scrollReveal.pills.from + index * scrollReveal.pills.step;
  const to = from + scrollReveal.pills.span;
  const opacity = useTransform(progress, [from, to], [0, 1]);
  const y = useTransform(progress, [from, to], [14, 0]);

  return (
    <motion.li style={{ opacity, y }} className={pillClass(index, total)}>
      {total ? children : <PillContent>{children}</PillContent>}
    </motion.li>
  );
}
