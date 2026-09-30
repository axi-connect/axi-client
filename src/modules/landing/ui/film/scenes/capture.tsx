import { Check, CheckCheck, CircleCheck, Globe, MapPin, Megaphone, MessageCircle, Phone, Send, ShoppingCart, type LucideIcon } from "lucide-react";

import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { Bubble } from "@/modules/landing/ui/film/parts/chat";
import { Ribbon } from "@/modules/landing/ui/film/parts/Ribbon";
import { SceneHead } from "@/modules/landing/ui/film/parts/SceneHead";

/* ───────────────────────────── Radar ───────────────────────────── */

const SOURCE_ICONS: Record<string, LucideIcon> = {
  "Google Maps": MapPin,
  "Sitio web": Globe,
  Teléfono: Phone,
  "Click-to-WhatsApp": MessageCircle,
  "Formulario de anuncio": Megaphone,
};

/** Puntos del radar: posiciones fijas (polares) para que servidor y cliente coincidan. */
const RADAR_DOTS: readonly [angle: number, radius: number, strength: number][] = [
  [12, 0.42, 0.3], [40, 0.8, 0.25], [66, 0.3, 0.45], [95, 0.62, 0.35], [120, 0.9, 0.25], [150, 0.5, 0.4],
  [178, 0.74, 0.3], [205, 0.36, 0.5], [230, 0.86, 0.25], [258, 0.55, 0.35], [285, 0.24, 0.45], [310, 0.7, 0.3],
  [335, 0.46, 0.4], [350, 0.92, 0.25], [80, 0.95, 0.2], [190, 0.16, 0.3],
];
const RADAR_HITS: readonly [angle: number, radius: number][] = [[305, 0.62], [200, 0.72], [110, 0.5]];

function polar(angle: number, radius: number) {
  const a = (angle * Math.PI) / 180;
  return { left: `${50 + 50 * radius * Math.cos(a)}%`, top: `${50 + 50 * radius * Math.sin(a)}%` };
}

export function RadarScene() {
  return (
    <section id="captar" data-scene="radar" data-chapter="Captar" aria-labelledby="radar-h" className="film-scene">
      <div className="film-spot top-[10%] right-[-10%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-brand)_10%,transparent),transparent)]" />
      <Ribbon d="M -40 780 C 260 740, 420 560, 640 540 S 860 500, 1010 490" className="max-lg:hidden" />
      <div className="film-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <SceneHead
          id="radar-h"
          eyebrow="Captar"
          strong="Encuentra a quien"
          thin="te va a comprar."
          lead={
            <ByNiche as="span">
              {(c) =>
                c.radar.mode === "prospects"
                  ? "Axi recorre tu zona, califica cada negocio y te dice con quién hablar."
                  : "Tus anuncios traen conversaciones. Axi califica cada una y te dice con quién hablar primero."
              }
            </ByNiche>
          }
        />

        <div className="relative lg:min-h-[560px]">
          {/* El radar: anillos, barrido y los negocios que va encontrando. */}
          <div className="relative mx-auto aspect-square w-[min(88vw,520px)] lg:mr-[150px]" aria-hidden="true" data-anim="radar">
            {[1, 0.75, 0.5, 0.25].map((s, i) => (
              <div
                key={s}
                className="absolute rounded-full border"
                style={{
                  inset: `${((1 - s) / 2) * 100}%`,
                  borderColor: `color-mix(in srgb, var(--foreground) ${5 + i * 3}%, transparent)`,
                }}
              />
            ))}
            <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--film-line)]" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--film-line)]" />
            <div
              data-anim="sweep"
              className="absolute inset-0 rounded-full bg-[conic-gradient(from_20deg,color-mix(in_srgb,var(--axi-brand)_34%,transparent),transparent_70deg,transparent)]"
            />
            {RADAR_DOTS.map(([a, r, s]) => (
              <span
                key={`${a}-${r}`}
                data-anim="dot"
                className="absolute size-1.5 -translate-1/2 rounded-full bg-foreground"
                style={{ ...polar(a, r), opacity: s }}
              />
            ))}
            {RADAR_HITS.map(([a, r]) => (
              <span
                key={`hit-${a}`}
                data-anim="hit"
                className="absolute size-2.5 -translate-1/2 rounded-full bg-[var(--axi-brand)] shadow-[0_0_0_6px_color-mix(in_srgb,var(--axi-brand)_18%,transparent),0_0_18px_var(--axi-brand)]"
                style={polar(a, r)}
              />
            ))}
            <span
              data-anim="target"
              className="absolute size-4 -translate-1/2 rounded-full bg-foreground shadow-[0_0_0_8px_color-mix(in_srgb,var(--foreground)_14%,transparent),0_0_30px_var(--axi-amber)]"
              style={polar(335, 0.3)}
            />
          </div>

          {/* La ficha del negocio encontrado. */}
          <ByNiche>
            {(c) => (
              <div
                data-anim="lead"
                className="film-glass relative z-[3] mx-auto mt-6 flex w-full max-w-[380px] flex-col gap-4 rounded-3xl p-5 lg:absolute lg:right-0 lg:bottom-0 lg:mt-0 lg:w-[360px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.radar.lead}</p>
                    <p className="film-dim text-[12.5px]">{c.radar.place}</p>
                  </div>
                  <span className="film-chip shrink-0 text-[var(--axi-success)]">Calificado</span>
                </div>
                <p className="flex items-baseline gap-2">
                  <span className="film-h text-[44px] tabular-nums" data-anim="score" data-to={c.radar.score}>
                    {c.radar.score}
                  </span>
                  <span className="film-dim text-sm">/ 100 · índice de calidad</span>
                </p>
                <div className="flex flex-col gap-2">
                  {c.radar.axes.map(([name, value]) => (
                    <div key={name} className="grid grid-cols-[minmax(0,1fr)_88px_26px] items-center gap-2.5 text-xs">
                      <span className="film-lead truncate">{name}</span>
                      <span className="h-1 rounded-full bg-[var(--film-line)]">
                        <span data-anim="axis" className="block h-full origin-left rounded-full bg-foreground" style={{ width: `${value}%` }} />
                      </span>
                      <span className="text-right tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-[var(--film-line)]" />
                <ul className="flex flex-col gap-2">
                  {c.radar.sources.map((s) => {
                    const Icon = SOURCE_ICONS[s] ?? Globe;
                    return (
                      <li key={s} data-anim="source" className="flex items-center justify-between gap-3 text-[12.5px]">
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="film-lead size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{s}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-[var(--axi-success)]">
                          <Check className="size-3.5" aria-hidden="true" />
                          Encontró datos
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {c.radar.decisor ? (
                  <div data-anim="decisor" className="rounded-2xl border border-[color-mix(in_srgb,var(--axi-violet)_30%,transparent)] bg-[color-mix(in_srgb,var(--axi-violet)_10%,transparent)] p-3.5">
                    <p className="film-eyebrow mb-1.5 text-[10px] text-[var(--axi-violet)]">Decisor</p>
                    <p className="font-semibold">
                      {c.radar.decisor.name} · {c.radar.decisor.role}
                    </p>
                    <p className="film-lead text-[12.5px]">{c.radar.decisor.confidence}</p>
                  </div>
                ) : null}
                <p className="film-lead text-[12.5px]">{c.radar.contactBy}</p>
              </div>
            )}
          </ByNiche>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Seguimiento ─────────────────────────── */

export function FollowupScene() {
  return (
    <section id="seguimiento" data-scene="followup" aria-labelledby="seguimiento-h" className="film-scene">
      <div className="film-spot top-[25%] left-[35%] size-[900px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--axi-amber)_8%,transparent),transparent)]" />
      <div className="film-wrap">
        <SceneHead
          id="seguimiento-h"
          eyebrow="Captar"
          tone="amber"
          strong="Nadie se queda"
          thin="esperando."
          lead="Si una venta no cerró, Axi vuelve en el momento justo. Y se detiene cuando te responden."
        />

        <ByNiche>
          {(c) => {
            const steps: { when: string; what: string; Icon: LucideIcon; tone: string }[] = [
              { when: "Mar · 9:12 p. m.", what: c.followup.cart, Icon: ShoppingCart, tone: "film-dim" },
              { when: "Mié · 10:00 a. m.", what: "Axi retoma con una plantilla aprobada por Meta", Icon: Send, tone: "text-[var(--axi-amber)]" },
              { when: "10:07 a. m.", what: "Leída", Icon: CheckCheck, tone: "text-[var(--axi-amber)]" },
              { when: "10:09 a. m.", what: `«${c.followup.reply}»`, Icon: MessageCircle, tone: "text-[var(--axi-success)]" },
            ];
            return (
              <div data-anim="track" className="relative mt-14 max-lg:mt-10">
                {/* La línea es la cinta de luz, en horizontal. */}
                <div className="absolute top-[22px] right-0 left-0 hidden h-[2px] bg-[linear-gradient(90deg,var(--axi-brand),var(--axi-amber),var(--axi-violet))] opacity-80 shadow-[0_0_18px_color-mix(in_srgb,var(--axi-amber)_60%,transparent)] lg:block" data-anim="line" />
                <ol className="relative grid gap-8 lg:grid-cols-4 lg:gap-6">
                  {steps.map(({ when, what, Icon, tone }) => (
                    <li key={when} data-anim="step" className="flex gap-4 lg:flex-col lg:items-center lg:text-center">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--foreground)_16%,transparent)] bg-[var(--film-surface-2)] shadow-[0_0_0_6px_var(--background)]">
                        <Icon className={`size-[18px] ${tone}`} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="film-dim block font-mono text-[11.5px]">{when}</span>
                        <span className="mt-1 block text-sm">{what}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                  <div className="flex flex-col gap-2 lg:max-w-[340px]">
                    <Bubble side="out" meta="Enviada · Entregada · Leída ✓✓">
                      {c.followup.template}
                    </Bubble>
                  </div>
                  <div className="flex flex-col lg:items-start">
                    <Bubble side="in" meta="10:09 a. m.">
                      {c.followup.reply}
                    </Bubble>
                  </div>
                  <div data-anim="result" className="film-glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
                    <CircleCheck className="size-5 shrink-0 text-[var(--axi-success)]" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">{c.followup.recovered}</span>
                      <span className="film-dim block text-xs">La tarea se cerró sola cuando respondió</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        </ByNiche>
      </div>
    </section>
  );
}
