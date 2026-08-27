import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { Sparkles } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { BrandCard } from "@/shared/components/ui/brand-card";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { TiltCard } from "@/modules/landing/ui/components/TiltCard";
import { CRM_SECTION } from "@/modules/landing/ui/content/productos.content";

/** Bloques por etapa del mini-pipeline (deterministas, nunca aleatorios). */
const PIPELINE_BLOCKS = [3, 4, 2, 3] as const;

/**
 * §5 `#crm` — bento de producto (referencia features-8 de tailark, traída a la
 * marca): rejilla de `BrandCard` (halo + resplandor tricolor en hover, nunca
 * `card.tsx`) con un visual pequeño por tarjeta. Las dos primeras llevan tilt
 * 3D. La última dice la verdad del estado: motor en producción, pantalla del
 * panel en camino.
 */
export default function ProductosCrmBento() {
  const { cards } = CRM_SECTION;

  return (
    <section
      id="crm"
      aria-label="CRM, leads y contactos"
      className="border-border/60 bg-muted/50 w-full scroll-mt-24 border-y"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <SectionHeading
          kicker={CRM_SECTION.kicker}
          title={CRM_SECTION.title}
          intro={CRM_SECTION.intro}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Scoring explicable */}
          <Reveal className="lg:col-span-2">
            <TiltCard depth={5} className="h-full rounded-xl">
              <BrandCard className="px-6 py-6">
                <div className="relative grid h-24 place-items-center">
                  <svg
                    aria-hidden
                    viewBox="0 0 220 90"
                    className="absolute h-[84px] w-[200px]"
                    fill="none"
                  >
                    <ellipse
                      cx="110"
                      cy="45"
                      rx="96"
                      ry="34"
                      stroke="var(--color-brand)"
                      strokeWidth="2.5"
                      opacity="0.8"
                      transform="rotate(-6 110 45)"
                    />
                  </svg>
                  <span className="font-heading text-5xl font-bold tracking-tight">
                    {cards.scoring.stat}
                  </span>
                </div>
                <CardText title={cards.scoring.title} body={cards.scoring.body} />
              </BrandCard>
            </TiltCard>
          </Reveal>

          {/* Pipeline que se llena solo */}
          <Reveal delay={0.06} className="lg:col-span-2">
            <TiltCard depth={5} className="h-full rounded-xl">
              <BrandCard className="px-6 py-6">
                <div className="grid h-24 grid-cols-4 items-end gap-2" aria-hidden>
                  {CRM_SECTION.cards.pipeline.stages.map((stage, col) => (
                    <div key={stage} className="flex flex-col gap-1.5">
                      {Array.from({ length: PIPELINE_BLOCKS[col] }).map((_, row) => (
                        <span
                          key={row}
                          className={cn(
                            "h-3.5 rounded-[5px] border",
                            col === PIPELINE_BLOCKS.length - 1
                              ? "border-success/30 bg-success/15"
                              : "border-brand/25 bg-brand/12",
                          )}
                        />
                      ))}
                      <span className="text-muted-foreground mt-1 truncate text-center text-[9px] tracking-[0.08em] uppercase">
                        {stage}
                      </span>
                    </div>
                  ))}
                </div>
                <CardText title={cards.pipeline.title} body={cards.pipeline.body} />
              </BrandCard>
            </TiltCard>
          </Reveal>

          {/* Contacto unificado */}
          <Reveal delay={0.12} className="lg:col-span-2">
            <BrandCard className="h-full px-6 py-6">
              <div className="relative h-24" aria-hidden>
                <svg viewBox="0 0 200 96" className="absolute inset-0 h-full w-full" fill="none">
                  <path
                    d="M42 22 C 90 22, 100 48, 148 48 M42 74 C 90 74, 100 48, 148 48"
                    stroke="var(--color-border)"
                    strokeWidth="1.5"
                  />
                </svg>
                <span className="text-logo-whatsapp bg-secondary absolute top-0 left-4 flex size-10 items-center justify-center rounded-full">
                  <FaWhatsapp className="size-5" />
                </span>
                <span className="text-logo-instagram bg-secondary absolute bottom-0 left-4 flex size-10 items-center justify-center rounded-full">
                  <FaInstagram className="size-5" />
                </span>
                <span className="border-border bg-card shadow-float absolute top-1/2 right-6 flex size-13 -translate-y-1/2 items-center justify-center rounded-full border">
                  <BrandMark className="size-8" />
                </span>
              </div>
              <CardText title={cards.unified.title} body={cards.unified.body} />
            </BrandCard>
          </Reveal>

          {/* Copiloto del vendedor */}
          <Reveal delay={0.18} className="lg:col-span-3">
            <BrandCard className="h-full px-6 py-6">
              <div className="flex h-24 flex-col justify-center gap-2">
                {cards.copilot.suggestions.map((suggestion) => (
                  <span
                    key={suggestion}
                    className="border-accent-violet/30 bg-accent-violet/8 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                  >
                    <Sparkles aria-hidden className="text-accent-violet size-3.5 shrink-0" />
                    {suggestion}
                  </span>
                ))}
              </div>
              <CardText title={cards.copilot.title} body={cards.copilot.body} />
            </BrandCard>
          </Reveal>

          {/* Honestidad: motor real, sin pantalla todavía */}
          <Reveal delay={0.24} className="lg:col-span-3">
            <BrandCard className="h-full px-6 py-6">
              <div className="flex h-24 items-center gap-4">
                <span
                  aria-hidden
                  className="bg-success size-2.5 shrink-0 rounded-full shadow-[0_0_12px_var(--color-success)]"
                />
                <code className="border-border bg-secondary/60 text-muted-foreground rounded-lg border px-3.5 py-2.5 font-mono text-[11px]">
                  {cards.honest.code}
                </code>
              </div>
              <CardText title={cards.honest.title} body={cards.honest.body} />
            </BrandCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CardText({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
