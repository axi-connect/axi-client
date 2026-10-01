import "../film-philosophy.css";

import { ArrowRight } from "lucide-react";

import { PHILOSOPHY, type PhilosophyPillar } from "@/modules/landing/domain/film/philosophy-content";
import { BrandPiece, BrandPieceStage, type RibbonName } from "@/modules/landing/ui/film/parts/BrandPiece";

/**
 * «Vendemos progreso» (plan §18, lienzo aprobado el 2026-10-01): la filosofía de
 * Axi en tres pilares, uno por cinta del isotipo.
 *
 * Escritorio con motor: la escena se fija y el scroll vertical mueve una pista
 * horizontal (intro + tres pilares de 1100 px) en tres capas de parallax
 * (engine/philosophy-scene.ts). Móvil: tarjetas con scroll-snap horizontal,
 * sin pin. Sin motor (movimiento reducido o JS que no llegó), en escritorio los
 * tres pilares quedan apilados y quietos: la misma tarjeta, en rejilla.
 */

const RIB: Record<PhilosophyPillar["ribbon"], RibbonName> = { coral: "coral", amber: "amber", violet: "violet" };
/** El isotipo se desarma: cada cinta se aparta por su dirección natural (solo translate). */
const SPLIT: readonly { rib: RibbonName; dx: number; dy: number }[] = [
  { rib: "coral", dx: -58, dy: 16 },
  { rib: "violet", dx: 52, dy: -30 },
  { rib: "amber", dx: 62, dy: 22 },
];

function Eyebrow({ pillar }: { pillar: PhilosophyPillar }) {
  return (
    <p className="film-philo-eyebrow" data-rib={pillar.ribbon}>
      <span className="tabular-nums opacity-60">{pillar.n}</span>
      <span className="film-philo-rule" aria-hidden="true" />
      <span className="film-philo-tone">{pillar.name}</span>
    </p>
  );
}

function Modules({ pillar }: { pillar: PhilosophyPillar }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`Lo que trabaja en ${pillar.name.toLowerCase()}`}>
      {pillar.modules.map((m) => (
        <li key={m} className="film-philo-chip">
          {m}
        </li>
      ))}
    </ul>
  );
}

/** Escritorio con motor: la pista horizontal. */
function Track() {
  return (
    <div className="film-philo-desk">
      <div className="film-philo-words" data-anim="philo-words" aria-hidden="true">
        {PHILOSOPHY.pillars.map((p, i) => (
          <span key={p.name} data-anim="philo-word" data-index={i} style={{ left: `calc(100vw + ${i * 1100 + 40}px)` }}>
            {p.name}
          </span>
        ))}
      </div>
      <div className="film-philo-track" data-anim="philo-track">
        <div className="film-philo-intro">
          <div className="film-philo-intro-copy">
            <p className="film-eyebrow film-dim">{PHILOSOPHY.eyebrow}</p>
            <h2 id="progreso-h" className="film-h text-[clamp(64px,6.1vw,88px)] leading-none tracking-[-0.05em]">
              {PHILOSOPHY.strong[0]}
              <br />
              {PHILOSOPHY.strong[1]}
              <br />
              <span className="t">{PHILOSOPHY.thin}</span>
            </h2>
            <p className="film-lead max-w-[520px] text-lg leading-relaxed">{PHILOSOPHY.lead}</p>
          </div>
          <div className="film-philo-mark" data-anim="philo-mark" aria-hidden="true">
            <span className="film-philo-bloom" />
            <span className="film-philo-mark-floor" />
            <span className="film-philo-mark-contact" />
            {SPLIT.map((s) => (
              <span key={s.rib} className="film-philo-split" data-anim="philo-split" data-dx={s.dx} data-dy={s.dy}>
                <BrandPiece rib={s.rib} height={380} frame="mark" />
              </span>
            ))}
            <span className="film-philo-mark-caption" data-anim="philo-split-caption">
              {PHILOSOPHY.splitCaption}
            </span>
          </div>
        </div>
        {PHILOSOPHY.pillars.map((p, i) => (
          <article key={p.name} className="film-philo-pillar" aria-labelledby={`progreso-${i}`} data-anim="philo-pillar">
            <div className="film-philo-copy">
              <Eyebrow pillar={p} />
              <h3 id={`progreso-${i}`} className="film-h text-[clamp(56px,5.3vw,76px)] leading-[1.02] tracking-[-0.045em]">
                {p.strong}
                <br />
                <span className="t">{p.thin}</span>
              </h3>
              <p className="film-lead text-[17px] leading-[1.65]">{p.body}</p>
              <Modules pillar={p} />
              <a href={p.href} className="film-philo-link">
                Ver «{p.intent}»
                <ArrowRight className="size-[15px]" aria-hidden="true" />
              </a>
            </div>
            <div className="film-philo-piece" data-anim="philo-piece" data-index={i}>
              <BrandPieceStage
                rib={RIB[p.ribbon]}
                caption={
                  <>
                    Pieza {p.n} · <span className="film-philo-tone">{p.tone}</span>
                  </>
                }
              />
            </div>
          </article>
        ))}
      </div>
      <ol className="film-philo-bars" aria-hidden="true">
        {PHILOSOPHY.pillars.map((p) => (
          <li key={p.name} data-rib={p.ribbon}>
            <span className="film-philo-bar">
              <span data-anim="philo-bar" />
            </span>
            <span className="film-philo-bar-label">
              {p.n} · {p.name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Móvil (y escritorio sin motor): las tres tarjetas. */
function Cards() {
  return (
    <div className="film-philo-static">
      <div className="film-philo-static-head">
        <p className="film-eyebrow film-dim">{PHILOSOPHY.eyebrow}</p>
        <h2 id="progreso-h-static" className="film-h text-[clamp(40px,5vw,64px)] leading-[1.02] tracking-[-0.05em]">
          {PHILOSOPHY.strong.join(" ")}
          <br />
          <span className="t">{PHILOSOPHY.thin}</span>
        </h2>
        <p className="film-lead max-w-[520px] text-[15px] leading-relaxed max-lg:hidden">{PHILOSOPHY.lead}</p>
      </div>
      <div className="film-philo-cards">
        {PHILOSOPHY.pillars.map((p, i) => (
          <article key={p.name} className="film-philo-card" aria-labelledby={`progreso-m-${i}`}>
            <BrandPieceStage rib={RIB[p.ribbon]} height={140} className="film-philo-card-piece" />
            <Eyebrow pillar={p} />
            <h3 id={`progreso-m-${i}`} className="film-h text-[32px] leading-[1.04] tracking-[-0.04em]">
              {p.strong}
              <br />
              <span className="t">{p.thin}</span>
            </h3>
            <p className="film-lead text-sm leading-relaxed">{p.body}</p>
            <Modules pillar={p} />
          </article>
        ))}
      </div>
      <p className="film-dim text-center text-xs lg:hidden">{PHILOSOPHY.mobileHint}</p>
    </div>
  );
}

export function PhilosophyScene() {
  // aria-labelledby nombra la sección aunque el titular de la pista esté oculto (sin motor).
  return (
    <section id="progreso" data-scene="philosophy" aria-labelledby="progreso-h" className="film-philo">
      <Track />
      <Cards />
    </section>
  );
}
