"use client";

import "./moves.css";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  Camera,
  Check,
  CheckCheck,
  ContactRound,
  CreditCard,
  Mic,
  Pause,
  Play,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  GAME,
  GAME_ABILITIES,
  GAME_MOVES,
  GAME_NOTES,
  PRODUCTOS_ANCHORS,
  PRODUCTOS_TRIAL,
  type GameAbilityId,
  type GameMessage,
  type GameMoveId,
} from "@/modules/landing/ui/content/productos.content";
import { FILM_ACTIVITY_EVENT, emitFilmEvent, type FilmActivityDetail } from "@/modules/landing/ui/film/film-events";
import { islandClassName } from "@/shared/components/features/island/Island";
import { PAGE_ISLAND_EVENT, type PageIslandDetail } from "@/shared/components/layout/site/site-island";
import { ProductosPhone } from "./ProductosPhone";
import { usePhoneFlight } from "./use-phone-flight";
import { GAME_HINT_EVENT, TOTAL_ABILITIES, crmDue, initialGame, isDone, play, reply, unlockCrm, type GameState } from "./game-state";

const ICONS: Record<GameAbilityId, LucideIcon> = {
  foto: Camera,
  voz: Mic,
  descuento: ShieldCheck,
  compra: CreditCard,
  agenda: CalendarClock,
  persona: UserRound,
  crm: ContactRound,
};



export { GAME_HINT_EVENT } from "./game-state";

type Action = { type: "play"; id: GameMoveId } | { type: "reply" } | { type: "crm" } | { type: "reset" };

function reducer(state: GameState, action: Action): GameState {
  if (action.type === "play") return play(state, action.id);
  if (action.type === "reply") return reply(state);
  if (action.type === "crm") return unlockCrm(state);
  return initialGame;
}

/**
 * #agente — «Juega a ser tu cliente» (plan §3). El visitante hace jugadas;
 * Axi responde con guion y cada jugada descubre una habilidad. Las notas de
 * voz suenan con los audios reales y solo tras un clic. En tinta (plan
 * productos_tinta §4.3): jugadas sobrias a la izquierda; a la derecha la isla
 * «Lo que acabas de ver», el progreso en siete tramos y el CTA al terminar.
 */
export function ProductosGame() {
  const reduced = useReducedMotion();
  const [state, dispatch] = useReducer(reducer, initialGame);
  const [toast, setToast] = useState<GameAbilityId | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [hint, setHint] = useState<GameMoveId | null>(null);
  const timers = useRef<number[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const prevGot = useRef(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const flightRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inView = useRef(false);

  usePhoneFlight(slotRef, flightRef, bodyRef);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, reduced ? 0 : ms));
  }, [reduced]);

  const stopAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }, []);

  const playAudio = useCallback((key: string, src: string, onEnd?: () => void) => {
    audio.current?.pause();
    const a = new Audio(src);
    audio.current = a;
    setPlaying(key);
    const done = () => {
      if (audio.current === a) setPlaying(null);
      onEnd?.();
    };
    a.onended = done;
    a.play().catch(done);
  }, []);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    audio.current?.pause();
  }, []);

  /* Cada habilidad nueva se anuncia en la isla del nav, como el pago en la home. */
  useEffect(() => {
    const grew = state.got.length > prevGot.current;
    prevGot.current = state.got.length;
    if (!grew) return;
    const last = state.got[state.got.length - 1];
    const ability = GAME_ABILITIES.find((a) => a.id === last);
    if (ability) emitFilmEvent<FilmActivityDetail>(FILM_ACTIVITY_EVENT, { title: GAME.island.discovered(ability.name), detail: ability.line });
    setToast(last);
    const t = window.setTimeout(() => setToast((cur) => (cur === last ? null : cur)), 2600);
    return () => clearTimeout(t);
  }, [state.got]);

  /* Mientras el juego está en pantalla, la isla del nav dice «Juega a ser tu cliente · N de 7». */
  const islandText = useCallback(
    (n: number): PageIslandDetail => ({ source: "game", text: { title: GAME.island.title, sub: GAME.island.count(n, TOTAL_ABILITIES), ring: n / TOTAL_ABILITIES } }),
    [],
  );
  const gotRef = useRef(0);
  gotRef.current = state.got.length;
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const root = el.closest<HTMLElement>("[data-app-scroll]");
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        emitFilmEvent<PageIslandDetail>(PAGE_ISLAND_EVENT, entry.isIntersecting ? islandText(gotRef.current) : { source: "game", text: null });
      },
      // «En pantalla» = cruza la franja central de la ventana.
      { root, rootMargin: "-45% 0px -45% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      emitFilmEvent<PageIslandDetail>(PAGE_ISLAND_EVENT, { source: "game", text: null });
    };
  }, [islandText]);
  useEffect(() => {
    if (inView.current) emitFilmEvent<PageIslandDetail>(PAGE_ISLAND_EVENT, islandText(state.got.length));
  }, [state.got.length, islandText]);

  /* El CRM llega solo, un momento después de la tercera respuesta. */
  useEffect(() => {
    if (!crmDue(state) || state.pending) return;
    const t = window.setTimeout(() => dispatch({ type: "crm" }), reduced ? 0 : 2900);
    return () => clearTimeout(t);
  }, [state, reduced]);

  /* #reconocimiento: el router pide resaltar una jugada. */
  useEffect(() => {
    const onHint = (e: Event) => setHint((e as CustomEvent<{ id: GameMoveId }>).detail.id);
    window.addEventListener(GAME_HINT_EVENT, onHint);
    return () => window.removeEventListener(GAME_HINT_EVENT, onHint);
  }, []);

  const onMove = (id: GameMoveId) => {
    if (state.used.includes(id) || state.pending) return;
    setHint(null);
    dispatch({ type: "play", id });
    const move = GAME_MOVES.find((m) => m.id === id)!;
    const voiceIn = move.customer.find((m) => m.kind === "voice");
    const voiceOut = move.reply.find((m) => m.kind === "voice");
    if (voiceIn?.kind === "voice") {
      // Primero suena el cliente; al terminar, Axi responde y suena su nota.
      playAudio(`${id}-0`, voiceIn.audio.src, () =>
        later(700, () => {
          dispatch({ type: "reply" });
          if (voiceOut?.kind === "voice") playAudio(`${id}-${move.customer.length}`, voiceOut.audio.src);
        }),
      );
      return;
    }
    later(id === "persona" ? 1400 : 1100, () => dispatch({ type: "reply" }));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopAudio();
    setToast(null);
    dispatch({ type: "reset" });
  };

  const n = state.got.length;
  const done = isDone(state);
  const toastAbility = GAME_ABILITIES.find((a) => a.id === toast);
  /* La isla de tinta cuenta la última habilidad descubierta (la del CRM llega sola). */
  const last = state.got[state.got.length - 1];
  const note = last ? GAME_NOTES[last] : GAME.note.intro;

  return (
    <section ref={sectionRef} id={PRODUCTOS_ANCHORS.game} aria-labelledby="agente-title" className="pj-scene pj-game">
      <h2 id="agente-title" className="sr-only">{`${GAME.island.title}. ${GAME.heading.strong} ${GAME.heading.thin}`}</h2>
      <p className="sr-only">{GAME.disclaimer}</p>
      <ul className="sr-only">
        {GAME_ABILITIES.map((a) => (
          <li key={a.id}>{`${a.name}: ${a.line}`}</li>
        ))}
      </ul>

      {/* La noticia de cada habilidad la ve la isla del nav; aquí, para lectores de pantalla. */}
      <p className="sr-only" role="status" aria-live="polite">
        {toastAbility ? `${GAME.island.discovered(toastAbility.name)}. ${toastAbility.line}. ${GAME.island.count(n, TOTAL_ABILITIES)}.` : ""}
      </p>

      {/* Móvil: la isla del nav lleva la marca, así que el capítulo va aquí, sobre el teléfono. */}
      <p className="pj-game-title-m pj-eyebrow text-[var(--axi-brand)]" aria-hidden="true">
        {GAME.island.title} · {GAME.island.count(n, TOTAL_ABILITIES)}
      </p>
      <div className="pj-board">
        <div className="pj-moves-col" data-rail="l">
          <p className="pj-eyebrow text-[var(--axi-brand)]">{GAME.heading.eyebrow}</p>
          <p className="pj-h pj-game-h" aria-hidden="true">
            <span className="block">{GAME.heading.strong}</span>{" "}
            <span className="t block">{GAME.heading.thin}</span>
          </p>
          <p className="pj-moves-sub">
            <b>{GAME.movesTitle}</b>
            <span className="pj-dim">{GAME.movesSub}</span>
          </p>
          <div className="pj-moves" role="group" aria-label={GAME.movesTitle}>
            {GAME_MOVES.map((m) => {
              const used = state.used.includes(m.id);
              const sending = state.pending === m.id;
              const status = sending ? "tx" : used ? "done" : undefined;
              const Icon = ICONS[m.id];
              const next = !used && state.used.length === 0 && m.id === GAME_MOVES[0].id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className="pj-move"
                  data-state={status}
                  data-next={next ? "" : undefined}
                  data-hint={hint === m.id ? "" : undefined}
                  aria-busy={sending || undefined}
                  disabled={used || state.pending !== null}
                  onClick={() => onMove(m.id)}
                >
                  <span className="pj-move-glyph" aria-hidden="true"><Icon className="size-[18px]" strokeWidth={1.8} /></span>
                  <span className="pj-move-lbl">
                    {m.label}
                    <small aria-hidden="true">{m.hint}</small>
                  </span>
                  <span className="pj-move-check" aria-hidden="true">{used && !sending ? <Check className="size-3" strokeWidth={3} /> : null}</span>
                </button>
              );
            })}
          </div>
        </div>

        <ProductosPhone
          slotRef={slotRef}
          flightRef={flightRef}
          bodyRef={bodyRef}
          head={
            <div className="pj-ph-head">
              <svg width="10" height="17" viewBox="0 0 10 17" aria-hidden="true">
                <path d="M8.5 1.5 1.8 8.5l6.7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="pj-ph-avatar" aria-hidden="true">
                <Image src={GAME.avatar.src} alt={GAME.avatar.alt} width={30} height={30} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm leading-tight font-semibold">{GAME.business}</span>
                <span className="pj-ph-status">
                  <span className="pj-ph-online" aria-hidden="true" />
                  {state.pending ? GAME.typing : GAME.online}
                </span>
              </div>
            </div>
          }
          compose={
            <div className="pj-ph-compose" aria-hidden="true">
              <span className="pj-ph-plus">
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M6 1v10M1 6h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="pj-ph-input">{GAME.composer}</span>
            </div>
          }
        >
          <div className="pj-chat-log" role="log" aria-label={GAME.chatLabel}>
            <div className="pj-chat-feed">
              <span className="pj-chat-day">{GAME.day}</span>
              {/* Al aterrizar el teléfono, Vera «escribe» su saludo (solo con vuelo; ver usePhoneFlight). */}
              {state.log.length === 1 ? (
                <div className="pj-msg pj-greet-typing" data-side="out" aria-hidden="true">
                  <span className="pj-chat-typing"><i /><i /><i /></span>
                </div>
              ) : null}
              {state.log.map((entry, i) => (
                <Message key={entry.key} id={entry.key} time={clockAt(i)} message={entry.message} playing={playing === entry.key} onVoice={(src) => (playing === entry.key ? stopAudio() : playAudio(entry.key, src))} />
              ))}
              {state.pending ? (
                <div className="pj-msg" data-side="out" aria-label={GAME.typing}>
                  <span className="pj-chat-typing" aria-hidden="true"><i /><i /><i /></span>
                </div>
              ) : null}
            </div>
          </div>
        </ProductosPhone>

        <div className="pj-side" data-rail="r">
          {/* Isla de tinta con brillo de IA: cuenta lo que hizo el agente (DS §9.5.1). */}
          <div className={`${islandClassName({ material: "ink", glow: "ai" })} pj-note`} aria-hidden="true">
            <span className="pj-note-kicker text-muted-foreground">{GAME.note.kicker}</span>
            <p className="pj-note-title">{note.title}</p>
            <p className="pj-note-text text-muted-foreground">{note.text}</p>
          </div>
          <div className="pj-prog">
            <p className="pj-prog-top">
              <b className="pj-h">{n} <span className="t">{GAME.progress.of}</span></b>
              <span className="pj-dim">{GAME.progress.label}</span>
            </p>
            <div className="pj-prog-track" aria-hidden="true">
              {GAME_ABILITIES.map((a) => <i key={a.id} data-on={state.got.includes(a.id) ? "" : undefined} />)}
            </div>
            <ul className="pj-prog-chips" aria-label={GAME.abilitiesTitle}>
              {GAME_ABILITIES.map((a) => (
                <li key={a.id} data-on={state.got.includes(a.id) ? "" : undefined}>{a.name}</li>
              ))}
            </ul>
          </div>
          {done ? (
            <div className="pj-finish">
              <p className="pj-h pj-finish-h">
                <span className="block">{GAME.done.strong}</span>{" "}
                <span className="t block">{GAME.done.thin}</span>
              </p>
              <Link href={PRODUCTOS_TRIAL.href} prefetch={false} className="pj-cta w-full">
                {PRODUCTOS_TRIAL.label}
              </Link>
              <p className="pj-dim m-0 text-center text-[13px]">{PRODUCTOS_TRIAL.micro}</p>
              <button type="button" onClick={reset} className="pj-link mx-auto text-[13px]">
                {GAME.done.replay}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** La hora de cada mensaje: el chat empezó a las 9:32 y la barra marca las 9:41. */
function clockAt(i: number) {
  return `9:${String(Math.min(41, 32 + i)).padStart(2, "0")}`;
}

/** El lado del hilo: el cliente entra a la izquierda; Axi y el equipo salen a la derecha, en tinta. */
const SIDE = { customer: "in", agent: "out", human: "out" } as const;

function Meta({ time, out }: { time: string; out: boolean }) {
  return (
    <span className="pj-chat-meta">
      {time}
      {out ? <CheckCheck className="size-3" aria-label={GAME.read} /> : null}
    </span>
  );
}

function Message({ id, time, message, playing, onVoice }: { id: string; time: string; message: GameMessage; playing: boolean; onVoice: (src: string) => void }) {
  switch (message.kind) {
    case "text": {
      const side = SIDE[message.from];
      return (
        <div className="pj-msg" data-side={side} data-greeting={id === "greeting" ? "" : undefined}>
          <p className="pj-chat-bub" data-human={message.from === "human" ? "" : undefined}>
            {message.author ? <span className="pj-chat-author">{message.author}</span> : null}
            {message.text}
            <Meta time={time} out={side === "out"} />
          </p>
        </div>
      );
    }
    case "event":
      return (
        <div className="pj-msg" data-side="system">
          <span className="pj-chat-system" data-tone={message.tone}>
            <Check className="size-3" aria-hidden="true" />
            {message.text}
          </span>
        </div>
      );
    case "photo":
      return (
        <div className="pj-msg" data-side="in">
          <figure className="pj-chat-photo m-0">
            <Image src={message.imageSrc} alt={message.imageAlt} width={190} height={128} />
            <figcaption>
              {message.caption}
              <Meta time={time} out={false} />
            </figcaption>
          </figure>
        </div>
      );
    case "card": {
      const side = SIDE[message.from === "agent" ? "agent" : "customer"];
      return (
        <div className="pj-msg" data-side={side}>
          <div className="pj-chat-card">
            {message.imageSrc ? (
              <div className="pj-chat-card-art">
                <Image src={message.imageSrc} alt={message.imageAlt ?? ""} width={196} height={128} />
              </div>
            ) : null}
            <div className="px-3 pt-[9px] pb-[10px]">
              <p className="pj-chat-kicker">{message.kicker}</p>
              <p className="text-[13px] font-semibold tabular-nums">{message.title}</p>
              <p className="flex items-center justify-between gap-2 text-xs tabular-nums opacity-70">
                <span className="truncate">{message.meta}</span>
                <Meta time={time} out={side === "out"} />
              </p>
            </div>
          </div>
        </div>
      );
    }
    case "voice": {
      const side = SIDE[message.from];
      return (
        <div className="pj-msg" data-side={side} id={`voz-${id}`}>
          <div className="pj-chat-bub pj-chat-voice">
            <div className="flex items-center gap-2.5">
              <button type="button" className="pj-voice" onClick={() => onVoice(message.audio.src)} aria-label={playing ? GAME.pauseVoice : GAME.playVoice}>
                {playing ? <Pause className="size-3" fill="currentColor" aria-hidden="true" /> : <Play className="size-3" fill="currentColor" aria-hidden="true" />}
              </button>
              <span className="pj-wave" data-playing={playing ? "" : undefined} aria-hidden="true">
                {Array.from({ length: 18 }, (_, i) => <i key={i} />)}
              </span>
              <span className="text-[10.5px] tabular-nums opacity-60">{message.audio.duration}</span>
            </div>
            <span className="text-[11px] leading-snug opacity-75">«{message.text}»</span>
            <Meta time={time} out={side === "out"} />
          </div>
        </div>
      );
    }
  }
}
