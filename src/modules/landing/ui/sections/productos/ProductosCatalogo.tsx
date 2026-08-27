import { CalendarClock, PackageSearch, Search } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { TabletFrame } from "@/modules/landing/ui/components/mockups/TabletFrame";
import { CATALOG_SECTION } from "@/modules/landing/ui/content/productos.content";

const FEATURE_ICONS = { search: Search, variants: PackageSearch } as const;

const TILE_TONES = {
  brand: "bg-brand/10 text-brand",
  amber: "bg-accent-amber/15 text-accent-amber",
} as const;

const LOW_STOCK = 3;

/** Cabeceras del mini-calendario (semana es-CO). */
const WEEK = ["L", "M", "M", "J", "V", "S", "D"] as const;

/**
 * §6 `#catalogo` — el catálogo dentro del tablet 3D (device frame que se
 * endereza con el scroll) + el bloque de agenda. El mock del catálogo es
 * estilizado pero dice cosas verdaderas del producto: búsqueda tolerante a
 * typos, SKU por variante y stock real.
 */
export default function ProductosCatalogo() {
  const { tablet, agenda } = CATALOG_SECTION;

  return (
    <section
      id="catalogo"
      aria-label="Catálogo y agenda"
      className="w-full scroll-mt-24 overflow-x-clip"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <Reveal className="max-lg:order-2">
          <TabletFrame>
            {/* Barra: la búsqueda con typo corregido es EL mensaje. */}
            <div className="border-border/70 bg-secondary/50 flex items-center gap-2.5 border-b px-3.5 py-2.5">
              <span className="border-border bg-background text-muted-foreground flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px]">
                <Search aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate font-mono">{tablet.search}</span>
              </span>
              <span className="bg-accent text-brand rounded-full px-3 py-1 text-[10.5px] font-semibold">
                {tablet.category}
              </span>
            </div>
            {/* Rejilla de productos */}
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3">
              {tablet.products.map((product) => (
                <div
                  key={product.id}
                  className="border-border bg-card overflow-hidden rounded-xl border"
                >
                  <div
                    aria-hidden
                    className={cn(
                      "font-heading grid h-16 place-items-center text-xl font-bold",
                      TILE_TONES[product.tone as keyof typeof TILE_TONES],
                    )}
                  >
                    {product.name.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-1 px-2.5 py-2">
                    <span className="truncate text-[11.5px] font-semibold">{product.name}</span>
                    <span className="text-muted-foreground font-mono text-[9.5px]">
                      SKU {product.sku}
                    </span>
                    <span
                      className={cn(
                        "w-fit rounded-full px-2 py-0.5 text-[9px] font-bold",
                        product.stock <= LOW_STOCK
                          ? "bg-warning/15 text-warning"
                          : "bg-success/12 text-success",
                      )}
                    >
                      {product.stock <= LOW_STOCK ? `Quedan ${product.stock}` : `Stock ${product.stock}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabletFrame>
        </Reveal>

        <div className="max-lg:order-1">
          <SectionHeading
            kicker={CATALOG_SECTION.kicker}
            title={CATALOG_SECTION.title}
            intro={CATALOG_SECTION.intro}
          />
          <ul className="mt-8 flex flex-col gap-5">
            {CATALOG_SECTION.features.map((feature, i) => {
              const Icon = FEATURE_ICONS[feature.id as keyof typeof FEATURE_ICONS] ?? Search;
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

          {/* Agenda sobre disponibilidad real */}
          <Reveal delay={0.16}>
            <div className="border-border bg-card mt-8 flex items-center gap-5 rounded-2xl border p-5 shadow-float">
              <div aria-hidden className="grid shrink-0 grid-cols-7 gap-1">
                {WEEK.map((day, i) => (
                  <span
                    key={`w-${i}`}
                    className="text-muted-foreground grid size-6 place-items-center text-[9px] font-semibold"
                  >
                    {day}
                  </span>
                ))}
                {Array.from({ length: 14 }).map((_, i) => {
                  const day = i + 1;
                  const busy = agenda.busyDays.includes(day);
                  return (
                    <span
                      key={day}
                      className={cn(
                        "grid size-6 place-items-center rounded-md border text-[9px]",
                        busy
                          ? "border-brand/35 bg-accent text-brand font-bold"
                          : "border-border bg-secondary/40 text-muted-foreground",
                      )}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <CalendarClock aria-hidden className="text-brand size-4" />
                  {agenda.title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{agenda.body}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
