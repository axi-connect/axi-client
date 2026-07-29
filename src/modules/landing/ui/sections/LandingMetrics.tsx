import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { TiltCard } from "@/modules/landing/ui/components/TiltCard";
import { FunnelPreview } from "@/modules/landing/ui/components/mockups/FunnelPreview";
import { LaptopMockup } from "@/modules/landing/ui/components/mockups/LaptopMockup";
import { StatTile } from "@/modules/landing/ui/components/mockups/StatTile";
import { Button } from "@/shared/components/ui/button";
import { LANDING_ANCHORS, METRICS } from "@/modules/landing/ui/content/landing.content";

/**
 * §6 La medición — la sección estrella: la prueba de la promesa del hero.
 * El laptop se abre con el scroll y muestra el dashboard real (/analytics);
 * las cuatro métricas como stat-tiles con count-up. Único lugar de la página
 * con acento violeta (DESIGN.md §3.1).
 */
export default function LandingMetrics() {
  const { dashboard } = METRICS;

  return (
    // overflow-x-clip: la tapa del laptop cerrada (rotateX −72° + perspective)
    // proyecta más ancha que el viewport en pantallas <1440px y generaba
    // scroll horizontal en toda la página hasta que la tapa se abría.
    <section id={LANDING_ANCHORS.metrics} className="w-full scroll-mt-24 overflow-x-clip">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <h2 className="font-heading max-w-[1000px] text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.16]">
            <span className="text-muted-foreground/60">{METRICS.titleMuted}</span>
            <br />
            {METRICS.titleStrong}
          </h2>
        </Reveal>

        {/* Dashboard dentro del laptop que se abre con el scroll */}
        <div className="mt-14 mb-14">
          <LaptopMockup windowTitle={dashboard.windowTitle}>
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              {/* Embudo en pesos */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{dashboard.funnelTitle}</span>
                  <span className="bg-accent-violet/12 text-accent-violet rounded-full px-2.5 py-1 font-mono text-[10px] font-medium">
                    {dashboard.funnelBadge}
                  </span>
                </div>
                <FunnelPreview items={dashboard.funnel} />
                <div className="border-border/70 flex flex-wrap gap-x-7 gap-y-3 border-t pt-5">
                  {dashboard.summary.map((item) => (
                    <div key={item.label} className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">{item.label}</span>
                      <span className="font-mono text-lg font-semibold tracking-tight tabular-nums">
                        {item.display}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking de qué corregir */}
              <div className="border-border bg-secondary/40 flex flex-col gap-4 rounded-xl border p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">{dashboard.issuesTitle}</span>
                  <span className="text-muted-foreground text-xs">{dashboard.issuesSubtitle}</span>
                </div>
                <ol className="flex flex-col gap-3">
                  {dashboard.issues.map((issue, i) => (
                    <li key={issue} className="flex items-start gap-3 text-[13.5px] leading-relaxed">
                      <span className="text-accent-violet font-mono text-xs font-semibold tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {issue}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </LaptopMockup>
        </div>

        {/* Las cuatro métricas */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.statTiles.map((tile, i) => (
            <Reveal key={tile.id} delay={i * 0.08} className="h-full">
              <TiltCard depth={6} className="h-full">
                <StatTile
                  title={tile.title}
                  body={tile.body}
                  value={tile.value}
                  decimals={tile.decimals}
                  prefix={tile.prefix}
                  suffix={tile.suffix}
                  accent
                />
              </TiltCard>
            </Reveal>
          ))}
        </div>

        {/* Honestidad de la medición + CTA */}
        <Reveal className="mt-12">
          <div className="border-border bg-card flex flex-col items-start gap-6 rounded-2xl border p-8 shadow-float md:flex-row md:items-center md:justify-between">
            <p className="max-w-3xl text-[15px] leading-relaxed">
              <strong className="font-semibold">{METRICS.honestyLead}</strong> {METRICS.honesty}
            </p>
            <Button asChild size="lg" className="h-11 shrink-0 px-6">
              <a href={`#${LANDING_ANCHORS.demo}`}>{METRICS.cta}</a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
