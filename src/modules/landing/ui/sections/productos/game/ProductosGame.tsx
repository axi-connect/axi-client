"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  Camera,
  Check,
  ContactRound,
  CreditCard,
  Lock,
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
  PRODUCTOS_ANCHORS,
  PRODUCTOS_TRIAL,
  type GameAbilityId,
  type GameMessage,
  type GameMoveId,
} from "@/modules/landing/ui/content/productos.content";
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

const TONE: Record<GameAbilityId, string> = Object.fromEntries(GAME_ABILITIES.map((a) => [a.id, a.tone])) as Record<GameAbilityId, string>;


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
 * voz suenan con los audios reales y solo tras un clic.
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

  /* Cada habilidad nueva se anuncia en la isla. */
  useEffect(() => {
    const grew = state.got.length > prevGot.current;
    prevGot.current = state.got.length;
    if (!grew) return;
    const last = state.got[state.got.length - 1];
    setToast(last);
    const t = window.setTimeout(() => setToast((cur) => (cur === last ? null : cur)), 2600);
    return () => clearTimeout(t);
  }, [state.got]);

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
  const ring = 88 - (88 * n) / TOTAL_ABILITIES;

  return (
    <section id={PRODUCTOS_ANCHORS.game} aria-labelledby="agente-title" className="pj-scene pj-game">
      <div className="pj-glow" aria-hidden="true" />
      <h2 id="agente-title" className="sr-only">{GAME.island.title}</h2>
      <p className="sr-only">{GAME.note}</p>
      <ul className="sr-only">
        {GAME_ABILITIES.map((a) => (
          <li key={a.id}>{`${a.name}: ${a.line}`}</li>
        ))}
      </ul>

      {/* La isla: título, progreso y la noticia de cada habilidad. */}
      <div className="pj-island" role="status" aria-live="polite">
        <div className="flex h-[60px] items-center gap-3 pr-2 pl-3">
          <svg width="26" height="26" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray="88" strokeDashoffset={ring} strokeLinecap="round" transform="rotate(-90 18 18)" style={{ transition: "stroke-dashoffset .5s" }} />
          </svg>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{GAME.island.title}</span>
            <span className="pj-dim text-[11.5px]">{GAME.island.count(n, TOTAL_ABILITIES)}</span>
          </div>
          <Link href={PRODUCTOS_TRIAL.href} prefetch={false} className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-full px-[18px] text-sm font-semibold whitespace-nowrap">
            {PRODUCTOS_TRIAL.label}
          </Link>
        </div>
        <div className="pj-island-toast" data-open={toastAbility ? "" : undefined}>
          <div>
            {toastAbility ? (
              <div className="mx-3.5 flex items-center gap-3 border-t border-[var(--pj-line)] py-3">
                <span className="pj-ability-orb !size-8" data-tone={toastAbility.tone} style={{ background: "var(--pj-tone)", color: "var(--background)" }}>
                  <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13.5px] font-semibold">{GAME.island.discovered(toastAbility.name)}</span>
                  <span className="pj-dim text-[11.5px]">{toastAbility.line}</span>
                </div>
                <span className="pj-dim text-[11px]">{GAME.island.now}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Móvil: el progreso en siete puntos. */}
      <div className="pj-dots flex gap-2.5" aria-hidden="true">
        {GAME_ABILITIES.map((a) => {
          const on = state.got.includes(a.id);
          return <span key={a.id} data-tone={a.tone} className="size-2.5 rounded-full transition-colors duration-500" style={{ background: on ? "var(--pj-tone)" : "var(--pj-line)", boxShadow: on ? "0 0 12px var(--pj-tone)" : "none" }} />;
        })}
      </div>

      <div className="pj-board">
        <div className="pj-abilities" aria-label={GAME.abilitiesTitle}>
          <div className="pj-abilities-rail" aria-hidden="true">
            <span style={{ height: `${(100 * n) / TOTAL_ABILITIES}%` }} />
          </div>
          <p className="pj-eyebrow mb-3 text-[var(--axi-brand)]">{GAME.abilitiesTitle}</p>
          {GAME_ABILITIES.map((a) => {
            const on = state.got.includes(a.id);
            const Icon = on ? ICONS[a.id] : Lock;
            return (
              <div key={a.id} className="pj-ability" data-tone={a.tone} data-locked={on ? undefined : ""}>
                <span className="pj-ability-orb">
                  <Icon className="size-[17px]" aria-hidden="true" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold">{on ? a.name : GAME.locked.name}</span>
                  <span className="pj-dim text-[12.5px]">{on ? a.line : GAME.locked.line}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pj-device pj-phone">
          <div className="pj-screen">
            <div className="pj-chat-head">
              <Image src={GAME.avatar.src} alt={GAME.avatar.alt} width={34} height={34} className="size-[34px] rounded-full bg-white object-cover" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{GAME.business}</span>
                <span className="text-[11px] text-[var(--axi-success)]">{state.pending ? GAME.typing : GAME.online}</span>
              </div>
            </div>
            <div className="pj-chat-log" role="log" aria-label={GAME.chatLabel}>
              {state.log.slice(-8).map((entry) => (
                <Message key={entry.key} id={entry.key} message={entry.message} playing={playing === entry.key} onVoice={(src) => (playing === entry.key ? stopAudio() : playAudio(entry.key, src))} />
              ))}
              {state.pending ? (
                <div className="pj-bubble" data-from="agent" aria-label={GAME.typing}>
                  <span className="pj-typing" aria-hidden="true"><i /><i /><i /></span>
                </div>
              ) : null}
            </div>
            <div className="pj-composer" aria-hidden="true">
              <div>{GAME.composer} →</div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="pj-eyebrow pj-dim mb-[18px] max-lg:hidden">{GAME.movesTitle}</p>
          {done ? (
            <div className="flex flex-col items-start gap-5 lg:pt-6">
              <p className="pj-h pj-h-lg">
                {GAME.done.strong} <span className="t">{GAME.done.thin}</span>
              </p>
              <Link href={PRODUCTOS_TRIAL.href} prefetch={false} className="pj-cta">
                {PRODUCTOS_TRIAL.label} →
              </Link>
              <button type="button" onClick={reset} className="pj-link text-[13px]">
                {GAME.done.replay}
              </button>
            </div>
          ) : (
            <div className="pj-moves" role="group" aria-label={GAME.movesTitle}>
              {GAME_MOVES.map((m) => {
                const Icon = ICONS[m.id];
                return (
                  <button key={m.id} type="button" className="pj-move" data-tone={TONE[m.id]} data-hint={hint === m.id ? "" : undefined} disabled={state.used.includes(m.id) || state.pending !== null} onClick={() => onMove(m.id)}>
                    <span className="pj-move-icon" aria-hidden="true"><Icon className="size-4" /></span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Message({ id, message, playing, onVoice }: { id: string; message: GameMessage; playing: boolean; onVoice: (src: string) => void }) {
  switch (message.kind) {
    case "text":
      return (
        <div className="pj-bubble" data-from={message.from}>
          {message.author ? <span className="pj-bubble-author">{message.author}</span> : null}
          {message.text}
        </div>
      );
    case "event":
      return <div className="pj-event" data-tone={message.tone}>{message.text}</div>;
    case "photo":
      return (
        <figure className="pj-photo m-0">
          <Image src={message.imageSrc} alt={message.imageAlt} width={180} height={120} />
          <figcaption className="pj-dim px-[11px] py-1.5 text-[10.5px]">{message.caption}</figcaption>
        </figure>
      );
    case "card":
      return (
        <div className="pj-card" data-from={message.from}>
          {message.imageSrc ? <Image src={message.imageSrc} alt={message.imageAlt ?? ""} width={216} height={110} /> : null}
          <div className="flex flex-col gap-0.5 px-[13px] py-2.5">
            <span className="pj-card-kicker">{message.kicker}</span>
            <span className="text-sm font-semibold">{message.title}</span>
            <span className="text-[11.5px] opacity-70">{message.meta}</span>
          </div>
        </div>
      );
    case "voice":
      return (
        <div className="pj-bubble flex w-[236px] flex-col gap-1.5" data-from={message.from} id={`voz-${id}`}>
          <div className="flex items-center gap-2.5">
            <button type="button" className="pj-voice" onClick={() => onVoice(message.audio.src)} aria-label={playing ? GAME.pauseVoice : GAME.playVoice}>
              {playing ? <Pause className="size-3" fill="currentColor" aria-hidden="true" /> : <Play className="size-3" fill="currentColor" aria-hidden="true" />}
            </button>
            <span className="pj-wave" data-playing={playing ? "" : undefined} aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => <i key={i} />)}
            </span>
            <span className="text-[10.5px] opacity-60">{message.audio.duration}</span>
          </div>
          <span className="text-[11px] opacity-75">«{message.text}»</span>
        </div>
      );
  }
}
