import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { TiltCard } from "@/modules/landing/ui/components/TiltCard";
import { FunnelPreview } from "@/modules/landing/ui/components/mockups/FunnelPreview";
import { LaptopMockup } from "@/modules/landing/ui/components/mockups/LaptopMockup";
import { StatTile } from "@/modules/landing/ui/components/mockups/StatTile";
import { METRICS } from "@/modules/landing/ui/content/landing.content";
import { MEASURE_SECTION } from "@/modules/landing/ui/content/productos.content";

/**
 * §7 `#medicion` — la prueba: el dashboard real dentro del laptop que se abre
 * con el scroll. Único acento violeta de la vista (DESIGN §3.1 y plan F6).
 * Las CIFRAS no viven en esta página: se reutiliza `METRICS` de la home —
 * una sola fuente de números para toda la capa pública.
 */
export default function ProductosMedicion() {
  const { dashboard } = METRICS;

  return (
    <section
      id="medicion"
      aria-label="Medición en pesos"
      className="w-full scroll-mt-24 overflow-x-clip"
      style={{
        background:
          "radial-gradient(55% 50% at 82% 0%, color-mix(in srgb, var(--axi-violet) 8%, transparent), transparent 70%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-accent-violet mb-3 text-sm font-medium tracking-wide">
            {MEASURE_SECTION.kicker}
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {MEASURE_SECTION.title}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 text-base leading-relaxed text-pretty">
            {MEASURE_SECTION.intro}
          </p>
        </Reveal>

        <div className="mt-14 mb-14">
          <LaptopMockup windowTitle={dashboard.windowTitle}>
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{dashboard.funnelTitle}</span>
                <span className="bg-accent-violet/12 text-accent-violet rounded-full px-2.5 py-1 font-mono text-[10px] font-medium">
                  {dashboard.funnelBadge}
                </span>
              </div>
              <FunnelPreview items={dashboard.funnel} />
              <div className="border-border/70 mt-5 flex flex-wrap gap-x-7 gap-y-3 border-t pt-5">
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
          </LaptopMockup>
        </div>

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
      </div>
    </section>
  );
}
