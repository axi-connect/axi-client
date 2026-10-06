import { CreditCard, ShieldCheck, Tag, UserRound, type LucideIcon } from "lucide-react";

import { CONTROL, PRODUCTOS_ANCHORS } from "@/modules/landing/ui/content/productos.content";
import { islandClassName } from "@/shared/components/features/island/Island";

const ICONS: Record<(typeof CONTROL.rules)[number]["id"], LucideIcon> = {
  precios: Tag,
  margen: ShieldCheck,
  pago: CreditCard,
  relevo: UserRound,
};

/**
 * #control — «Vende solo. Nunca sin ti.» Los guardarraíles reales del agente
 * contra las tres objeciones del dueño (plan productos_tinta §4.7), justo
 * después del precio. Bento de fichas y una franja de tinta con la regla.
 */
export function ProductosControl() {
  return (
    <section id={PRODUCTOS_ANCHORS.control} aria-labelledby="control-title" className="pj-band pj-control">
      <div className="pj-wrap pj-control-grid">
        <div className="flex flex-col items-start gap-5">
          <p className="pj-eyebrow text-[var(--axi-brand)]">{CONTROL.eyebrow}</p>
          <h2 id="control-title" className="pj-h pj-h-lg">
            <span className="block">{CONTROL.strong}</span>{" "}
            <span className="t block">{CONTROL.thin}</span>
          </h2>
          <p className="pj-lead max-w-[26rem] text-pretty">{CONTROL.lead}</p>
        </div>
        <div className="pj-bento">
          {CONTROL.rules.map((r) => {
            const Icon = ICONS[r.id];
            return (
              <div key={r.id} className="pj-card pj-rule">
                <span className="pj-glyph" aria-hidden="true">
                  <Icon className="size-5" strokeWidth={1.7} />
                </span>
                <h3 className="pj-card-title">{r.title}</h3>
                <p className="pj-card-text">{r.text}</p>
              </div>
            );
          })}
          <div className={`${islandClassName({ material: "ink", glow: "brand" })} pj-rule-ink`}>
            <div>
              <p className="text-muted-foreground m-0 text-[12.5px]">{CONTROL.rule.kicker}</p>
              <p className="pj-rule-quote">«{CONTROL.rule.quote}»</p>
            </div>
            <p className="pj-rule-aside text-muted-foreground">{CONTROL.rule.aside}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
