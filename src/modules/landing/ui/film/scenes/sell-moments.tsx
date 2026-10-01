import "../film-sell.css";

import { Bot, Lock, ScanSearch } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  FILM_PHOTO,
  FILM_TEAM,
  FILM_VAULT,
  VAULT_RECEIPTS,
} from "@/modules/landing/domain/film/tanda3-content";
import { ByNiche } from "@/modules/landing/ui/film/parts/ByNiche";
import { FILM_ICONS } from "@/modules/landing/ui/film/parts/film-icons";

/**
 * Tanda 3 · vender (plan §13, lienzo «Landing · Captar y vender»): foto,
 * llamada, bóveda y equipo. Cada escena tiene un objeto real como
 * protagonista —la captura y el estante, la onda de la voz, la etiqueta de
 * precio, el portátil— y todas van en tinta; el violeta queda solo en la voz de
 * Axi.
 *
 * El HTML es el fotograma final: sin motor (movimiento reducido o JS que no
 * llegó) cada escena se ve terminada. Los tiempos los pone
 * `engine/sell-scenes.ts`. El hilo está archivado (§15): el haz de escaneo y
 * la onda son trazos propios de cada escena.
 */

function Head({
  id,
  eyebrow,
  title,
  thin,
  lead,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  thin: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={cn("film-sell-head", className)} data-anim="head">
      <p className="film-eyebrow film-sell-dim">{eyebrow}</p>
      <h2 id={id} className="film-h film-sell-title">
        {title}
        <br />
        <span className="t">{thin}</span>
      </h2>
      {lead ? <p className="film-lead film-sell-lead">{lead}</p> : null}
    </div>
  );
}

/* ─────────────────────────────── Foto ─────────────────────────────── */

export function PhotoScene() {
  return (
    <section
      id="foto"
      data-scene="photo"
      aria-labelledby="foto-h"
      className="film-scene film-photo"
    >
      <div className="film-sell-spot film-photo-spot" aria-hidden="true" />
      <div className="film-photo-grid">
        <Head
          id="foto-h"
          eyebrow={FILM_PHOTO.eyebrow}
          title={FILM_PHOTO.title}
          thin={FILM_PHOTO.titleThin}
          lead={FILM_PHOTO.lead}
          className="film-photo-head"
        />
        <ByNiche>
          {(c, niche) => {
            const match = c.photo.catalog[c.photo.matchIndex];
            const MatchIcon = FILM_ICONS[match.icon];
            return (
              <>
                {/* El estante del catálogo, en perspectiva; el producto exacto se levanta de él. */}
                <div className="film-photo-shelf-wrap" aria-hidden="true">
                  <div className="film-photo-shelf">
                    {c.photo.catalog.map((item, i) => {
                      const Icon = FILM_ICONS[item.icon];
                      return (
                        <div
                          key={item.name}
                          className="film-photo-tile"
                          data-anim={
                            i === c.photo.matchIndex
                              ? "photo-slot"
                              : "photo-tile"
                          }
                        >
                          <Icon className="size-[30px]" strokeWidth={1.4} />
                          <span className="film-photo-tile-name">
                            {item.name}
                          </span>
                          <span className="film-photo-tile-price">
                            {item.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="film-photo-match"
                    data-anim="photo-match"
                    style={
                      { "--col": c.photo.matchIndex % 3 } as React.CSSProperties
                    }
                  >
                    <MatchIcon className="size-[34px]" strokeWidth={1.4} />
                    <span className="film-photo-match-name">{match.name}</span>
                    <span className="film-photo-match-price">
                      {match.price}
                    </span>
                    <span className="film-photo-match-sim">
                      {FILM_PHOTO.similarity(c.photo.similarity)}
                    </span>
                  </div>
                </div>

                {/* La captura del cliente: una lámina inclinada que el haz recorre. */}
                <div className="film-photo-sheet-wrap" aria-hidden="true">
                  <div className="film-photo-sheet" data-anim="photo-sheet">
                    <div className="film-photo-sheet-top">
                      <span className="film-photo-avatar" />
                      <span className="font-semibold">{c.photo.handle}</span>
                      <span className="film-photo-source">
                        {FILM_PHOTO.source}
                      </span>
                    </div>
                    <div className="film-photo-shot">
                      {/* La foto que manda el cliente (Unsplash, licencia libre; plan §24).
                          Diferida: las de los nichos ocultos no se piden. */}
                      {/* eslint-disable-next-line @next/next/no-img-element -- ya va optimizada (WebP 640×800, 13–32 kB) y lejos del LCP */}
                      <img
                        className="film-photo-img"
                        src={`/assets/film/photo/${niche}.webp`}
                        alt=""
                        width={640}
                        height={800}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <p className="film-photo-caption">{FILM_PHOTO.caption}</p>
                    <div className="film-photo-scan" data-anim="photo-scan" />
                  </div>
                </div>

                <p
                  className="film-photo-recognized"
                  data-anim="photo-recognized"
                >
                  <ScanSearch
                    className="size-[15px] shrink-0 text-[color-mix(in_srgb,var(--axi-violet)_38%,var(--foreground))]"
                    aria-hidden="true"
                  />
                  {/* Dos líneas, sin elipsis: «Reconocido» y la referencia con su similitud. */}
                  <span className="film-photo-recognized-text">
                    <strong className="font-semibold">
                      {FILM_PHOTO.recognized}
                    </strong>
                    <span className="film-sell-muted">
                      {FILM_PHOTO.match(match.name, c.photo.similarity)}
                    </span>
                  </span>
                </p>

                <div
                  className="film-sell-out film-photo-reply"
                  data-anim="photo-reply"
                >
                  {c.photo.reply}
                  <span className="film-sell-out-meta">{FILM_PHOTO.time}</span>
                </div>
              </>
            );
          }}
        </ByNiche>
      </div>
    </section>
  );
}

/* ────────────────────────────── Llamada ────────────────────────────── */

/** La llamada se escucha (plan §20): es un componente de cliente con su audio. */
export { CallScene } from "./call-scene";

/* ─────────────────────────────── Bóveda ─────────────────────────────── */

export function VaultScene() {
  return (
    <section
      id="garantias"
      data-scene="vault"
      aria-labelledby="boveda-h"
      className="film-scene film-vault"
    >
      <div className="film-sell-spot film-vault-spot" aria-hidden="true" />
      <div className="film-vault-layout">
        <Head
          id="boveda-h"
          eyebrow={FILM_VAULT.eyebrow}
          title={FILM_VAULT.title}
          thin={FILM_VAULT.titleThin}
          className="film-vault-head"
        />
        <p className="film-lead film-vault-lead">{FILM_VAULT.lead}</p>
        <ByNiche>
          {(c) => {
            const item = c.photo.catalog[c.photo.matchIndex];
            const receipt = VAULT_RECEIPTS[c.niche];
            return (
              <>
                <div className="film-vault-chat">
                  <div className="film-sell-in" data-anim="vault-ask">
                    {c.vault.ask}
                  </div>
                  <div className="film-sell-out" data-anim="vault-answer">
                    {c.vault.answer}
                    <span className="film-sell-out-meta">
                      {FILM_VAULT.answerNote}
                    </span>
                  </div>
                </div>

                {/* La etiqueta cuelga de su cordón; el cupón se imprime debajo. */}
                <div className="film-vault-hang">
                  <span className="film-vault-cord" aria-hidden="true" />
                  <div className="film-vault-tag-swing" data-anim="vault-tag">
                    <div className="film-vault-tag">
                      <span className="film-vault-eyelet" aria-hidden="true" />
                      <p className="film-vault-item">{item.name}</p>
                      <p className="film-vault-price">{item.price}</p>
                      <div className="film-vault-rule" aria-hidden="true" />
                      <ul className="film-vault-rules">
                        {FILM_VAULT.rules.map(([title, note]) => (
                          <li key={title}>
                            <Lock
                              className="size-[13px] shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              <strong>{title}</strong> · {note}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="film-vault-coupon" data-anim="vault-coupon">
                      <p className="film-vault-coupon-line">
                        <span>{receipt.line}</span>
                        <span>{receipt.note}</span>
                      </p>
                      <p className="film-vault-coupon-total">
                        <span>{receipt.totalLabel}</span>
                        <strong>{receipt.total}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            );
          }}
        </ByNiche>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Equipo ─────────────────────────────── */

export function TeamScene() {
  return (
    // `data-mode` dice quién atiende: 0 Axi, 1 en cola, 2 contigo. El final es Axi otra vez.
    <section
      id="equipo"
      data-scene="team"
      aria-labelledby="equipo-h"
      className="film-scene film-team"
      data-mode="0"
      data-returned=""
    >
      <div className="film-sell-spot film-team-spot" aria-hidden="true" />
      <div className="film-team-layout">
        <Head
          id="equipo-h"
          eyebrow={FILM_TEAM.eyebrow}
          title={FILM_TEAM.title}
          thin={FILM_TEAM.titleThin}
          lead={FILM_TEAM.lead}
          className="film-team-head"
        />

        <div className="film-team-stage">
          <ol className="film-team-modes" aria-label={FILM_TEAM.modesLabel}>
            {FILM_TEAM.modes.map((mode, i) => (
              <li key={mode} data-mode-chip={i}>
                <span className="film-team-mode">
                  <span className="film-team-mode-dot" aria-hidden="true" />
                  {mode}
                </span>
                {i < FILM_TEAM.modes.length - 1 ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="text-foreground/40"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                ) : null}
              </li>
            ))}
          </ol>

          {/* El portátil: la tapa se abre desde la bisagra; la base es un plano tendido. */}
          <div className="film-team-laptop">
            <div className="film-team-base" aria-hidden="true" />
            <div className="film-team-lid" data-anim="team-lid">
              <div className="film-team-bezel">
                <ByNiche>
                  {(c) => (
                    <div className="film-team-screen" data-anim="team-screen">
                      <div className="film-team-inbox">
                        <p className="film-team-inbox-title">
                          {FILM_TEAM.inbox}
                        </p>
                        {[c.team.customer, ...FILM_TEAM.others].map(
                          (name, i) => (
                            <div
                              key={name}
                              className={cn(
                                "film-team-row",
                                i === 0 && "is-active",
                              )}
                            >
                              <span
                                className="film-team-row-avatar"
                                aria-hidden="true"
                              />
                              <span className="min-w-0">
                                <span className="film-team-row-name">
                                  {name}
                                </span>
                                <span className="film-team-row-last">
                                  {i === 0 ? c.team.ask : FILM_TEAM.othersLast}
                                </span>
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                      <div className="film-team-thread">
                        <div className="film-team-thread-top">
                          <strong>{c.team.customer}</strong>
                          <span
                            className="film-team-return"
                            data-anim="team-return"
                          >
                            <Bot className="size-3" aria-hidden="true" />
                            {FILM_TEAM.returnTo}
                          </span>
                        </div>
                        <div className="film-team-msgs">
                          <div className="film-team-in" data-anim="team-ask">
                            {c.team.ask}
                            <span className="film-team-meta">
                              {FILM_TEAM.askTime}
                            </span>
                          </div>
                          <p className="film-team-note" data-anim="team-note">
                            <span className="max-lg:hidden">
                              {FILM_TEAM.handoff}
                            </span>
                            <span className="lg:hidden">
                              {FILM_TEAM.handoffShort}
                            </span>
                          </p>
                          <div className="film-team-out" data-anim="team-reply">
                            {/* El lector lee la respuesta entera; lo que se escribe letra a letra va oculto (auditoría m3). */}
                            <span className="sr-only">{c.team.reply}</span>
                            <span
                              data-anim="team-reply-text"
                              data-full={c.team.reply}
                              aria-hidden="true"
                            >
                              {c.team.reply}
                            </span>
                            <span className="film-team-meta">
                              {c.team.operator} · {FILM_TEAM.replyTime}
                            </span>
                          </div>
                          <p className="film-team-back" data-anim="team-back">
                            {FILM_TEAM.back}
                          </p>
                        </div>
                        <div className="film-team-composer">
                          {FILM_TEAM.composer(c.team.operator)}
                        </div>
                      </div>
                      <div className="film-team-glare" aria-hidden="true" />
                    </div>
                  )}
                </ByNiche>
              </div>
              <div
                className="film-team-shell"
                data-anim="team-shell"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
