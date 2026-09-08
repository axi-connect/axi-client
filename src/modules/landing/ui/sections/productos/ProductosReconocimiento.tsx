import {
  BadgeCheck,
  Camera,
  Check,
  CircleHelp,
  Instagram,
  Receipt,
  ScanSearch,
  SearchX,
  Settings2,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/core/lib/utils";
import { BrandCard } from "@/shared/components/ui/brand-card";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { ParallaxLayer } from "@/modules/landing/ui/components/ParallaxLayer";
import { DeviceChat } from "@/modules/landing/ui/components/mockups/DeviceChat";
import {
  AGENT_DEMO,
  RECOGNITION_SECTION,
  type RecognitionCandidate,
} from "@/modules/landing/ui/content/productos.content";

const OUTCOME_ICONS: Record<string, LucideIcon> = {
  high: BadgeCheck,
  medium: CircleHelp,
  none: SearchX,
};

const SOURCE_ICONS: Record<string, LucideIcon> = {
  photo: Camera,
  screenshot: Smartphone,
  share: Instagram,
};

const FACT_ICONS: Record<string, LucideIcon> = {
  settings: Settings2,
  index: Check,
  receipt: Receipt,
};

/**
 * Punto de color de la confianza. Badge NEUTRO + punto, nunca tinte al 10 %
 * con texto del mismo color: ese patrón no pasa AA en claro (verde 2,9:1,
 * medido el 2026-09-07).
 */
const CONFIDENCE_DOT: Record<RecognitionCandidate["confidence"], string> = {
  high: "bg-success",
  medium: "bg-warning",
  low: "bg-muted-foreground",
};

/**
 * §6b `#reconocimiento` — el reconocimiento de producto contado como funciona
 * (plan F8 §4.3). Dos vistas a propósito: el teléfono enseña lo que recibe el
 * CLIENTE (la respuesta con la referencia y el precio); la tarjeta «Lo que ve
 * tu equipo», solapada, enseña el porqué —el chip real del inbox con los
 * candidatos y su similitud. Prometer que el cliente ve el análisis sería
 * mentir: no lo ve.
 *
 * Violeta solo en los marcadores de IA (icono, chip, barra de similitud); el
 * acento de la vista sigue siendo coral (F6, decisión 7).
 */
export default function ProductosReconocimiento() {
  const { phone, backstage } = RECOGNITION_SECTION;

  return (
    <section
      id="reconocimiento"
      aria-label={RECOGNITION_SECTION.kicker}
      className="relative w-full scroll-mt-24 overflow-x-clip"
    >
      <ParallaxLayer
        strength={0.1}
        className="pointer-events-none absolute -bottom-20 -left-24 -z-10 max-lg:hidden"
      >
        <div
          aria-hidden
          className="size-[340px] rounded-full blur-[110px]"
          style={{ background: "color-mix(in srgb, var(--axi-brand) 18%, transparent)" }}
        />
      </ParallaxLayer>

      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <SectionHeading
              kicker={RECOGNITION_SECTION.kicker}
              title={RECOGNITION_SECTION.title}
              intro={RECOGNITION_SECTION.intro}
            />
            <ul className="mt-8 flex flex-col gap-5">
              {RECOGNITION_SECTION.outcomes.map((outcome, i) => {
                const Icon = OUTCOME_ICONS[outcome.id] ?? BadgeCheck;
                return (
                  <li key={outcome.id}>
                    <Reveal delay={i * 0.08} className="flex items-start gap-3.5">
                      <span
                        className="text-accent-violet flex size-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: "color-mix(in srgb, var(--axi-violet) 12%, var(--background))" }}
                      >
                        <Icon aria-hidden className="size-4.5" />
                      </span>
                      <div>
                        <h3 className="text-[15px] font-semibold">{outcome.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{outcome.body}</p>
                      </div>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Escenario: el teléfono del cliente y, solapada, la vista del equipo. */}
          <Reveal className="relative pb-24 lg:pb-20">
            <div className="flex h-[520px] justify-start pl-2 sm:h-[560px] sm:pl-8 lg:pr-24">
              <DeviceChat
                business={AGENT_DEMO.business}
                status={AGENT_DEMO.status}
                avatar={AGENT_DEMO.avatar}
                composerPlaceholder={AGENT_DEMO.composerPlaceholder}
                backLabel={AGENT_DEMO.backLabel}
                messages={[phone.photo, phone.reply]}
                visibleUpTo={2}
              />
            </div>
            <Backstage />
          </Reveal>
        </div>

        {/* Las tres fuentes que el producto acepta hoy. */}
        <ul className="mt-14 grid gap-3 sm:grid-cols-3">
          {RECOGNITION_SECTION.sources.map((source) => {
            const Icon = SOURCE_ICONS[source.id] ?? Camera;
            return (
              <li key={source.id}>
                <BrandCard surface="solid" className="flex h-full items-start gap-3.5 p-4">
                  <span className="bg-secondary text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{source.title}</h3>
                    <p className="text-muted-foreground text-[13px] leading-relaxed">{source.body}</p>
                  </div>
                </BrandCard>
              </li>
            );
          })}
        </ul>

        <ul className="text-muted-foreground mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          {RECOGNITION_SECTION.facts.map((fact) => {
            const Icon = FACT_ICONS[fact.id] ?? Check;
            return (
              <li key={fact.id} className="inline-flex items-center gap-2">
                <Icon aria-hidden className="text-brand size-3.5 shrink-0" />
                {fact.text}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );

  /**
   * «Lo que ve tu equipo»: réplica fiel de `ProductRecognitionChip` del inbox
   * (mismo vocabulario: descripción de la visión, hasta tres candidatos con
   * barra de similitud y confianza). No se importa el componente privado: el
   * sitio público no depende de un slice del workspace.
   */
  function Backstage() {
    return (
      <div className="border-border bg-card shadow-float absolute right-0 bottom-0 w-[min(100%,330px)] overflow-hidden rounded-2xl border text-xs">
        <div className="text-muted-foreground flex items-center justify-between px-3.5 pt-2.5 text-[11px] font-medium tracking-wider uppercase">
          <span>{backstage.label}</span>
          <span
            className="text-accent-violet inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] normal-case tracking-normal"
            style={{ background: "color-mix(in srgb, var(--axi-violet) 12%, var(--background))" }}
          >
            <ScanSearch aria-hidden className="size-3" />
            {backstage.badge}
          </span>
        </div>
        <div className="mt-2">
          <div className="text-muted-foreground border-border/60 flex items-center gap-1.5 border-b px-3.5 py-1.5 text-[10px] tracking-wider uppercase">
            <ScanSearch aria-hidden className="text-accent-violet size-3" />
            {backstage.header}
          </div>
          <p className="px-3.5 pt-2 pb-1 text-[12.5px]">{backstage.description}</p>
          <ol className="flex flex-col gap-0.5 px-1.5 pt-1 pb-2">
            {backstage.candidates.map((candidate) => {
              const pct = Math.round(candidate.score * 100);
              return (
                <li key={candidate.id} className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-2 py-1.5">
                  <span className="font-medium">
                    {candidate.name}
                    <span className="text-muted-foreground ml-1.5 font-mono text-[11px]">{candidate.sku}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">{candidate.price}</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full" aria-hidden>
                      <div className="bg-accent-violet h-full rounded-full" style={{ width: `${String(pct)}%` }} />
                    </div>
                    <span
                      className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-1.5 text-[10px] font-semibold tracking-wide uppercase"
                      aria-label={`Confianza ${backstage.confidenceLabel[candidate.confidence].toLowerCase()}, similitud ${String(pct)} %`}
                    >
                      <span aria-hidden className={cn("size-1.5 rounded-full", CONFIDENCE_DOT[candidate.confidence])} />
                      {backstage.confidenceLabel[candidate.confidence]} ·{" "}
                      {candidate.score.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-muted-foreground border-border/60 border-t px-3.5 py-2 text-[11px]">{backstage.foot}</p>
        </div>
      </div>
    );
  }
}
