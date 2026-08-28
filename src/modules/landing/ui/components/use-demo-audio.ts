"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Clip que la escena quiere oír ahora mismo. */
export interface DemoClip {
  id: string;
  src: string;
}

/**
 * El scroll no desbloquea sonido: espera a que se asiente (ms). El audio es
 * temporal y el scroll posicional, así que sin esto bajar rápido dispararía
 * y cortaría un clip por cada burbuja que pasa.
 */
const SETTLE_MS = 150;
/** Rampa de salida. Un `pause()` seco a media palabra es lo que suena barato. */
const FADE_MS = 180;
const FADE_STEP_MS = 20;

/**
 * Audio de la demo de `#agente`: UN SOLO `<audio>` para toda la escena, así
 * nunca suenan dos voces a la vez (mismo criterio que `VoiceSelector` del
 * panel).
 *
 * Por qué hace falta ARMAR con un clic y no basta el scroll: **el scroll no
 * cuenta como gesto de activación** en ningún navegador, así que `play()` con
 * sonido se rechaza mientras el documento no haya recibido un clic o una
 * pulsación. Un visitante que solo baja obtendría un rechazo silencioso. Y la
 * WCAG 1.4.2 exige un control de pausa para cualquier audio que arranque solo
 * y dure más de 3 s, así que el botón hace falta igual.
 *
 * El elemento se reutiliza entre clips a propósito: Safari «bendice» el
 * elemento que se reprodujo dentro de un gesto, no el origen, así que crear
 * uno nuevo por clip volvería a toparse con la política en cada mensaje.
 */
export function useDemoAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Lo que suena, en una ref además del estado: los callbacks no deben
   *  recrearse en cada cambio ni leer un valor rancio. */
  const currentRef = useRef<string | null>(null);

  const [armed, setArmed] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const element = useCallback(() => {
    audioRef.current ??= new Audio();
    audioRef.current.preload = "auto";
    return audioRef.current;
  }, []);

  const cancelFade = useCallback(() => {
    if (fadeRef.current === null) return;
    clearInterval(fadeRef.current);
    fadeRef.current = null;
  }, []);

  const stop = useCallback(
    (fade: boolean) => {
      const audio = audioRef.current;
      currentRef.current = null;
      setPlayingId(null);
      setProgress(0);
      if (!audio) return;
      cancelFade();
      if (!fade) {
        audio.pause();
        audio.volume = 1;
        return;
      }
      const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
      let step = 0;
      fadeRef.current = setInterval(() => {
        step += 1;
        audio.volume = Math.max(0, 1 - step / steps);
        if (step < steps) return;
        cancelFade();
        audio.pause();
        audio.volume = 1;
      }, FADE_STEP_MS);
    },
    [cancelFade],
  );

  const play = useCallback(
    (clip: DemoClip) => {
      const audio = element();
      cancelFade();
      audio.volume = 1;
      /* Cambiar `src` reinicia el recurso; si ya es el mismo clip basta con
         rebobinar, que evita una petición de red por repetición. */
      if (!audio.src.endsWith(clip.src)) audio.src = clip.src;
      audio.currentTime = 0;
      currentRef.current = clip.id;
      setPlayingId(clip.id);
      setProgress(0);
      void audio.play().catch(() => {
        /* Política del navegador: aún no hay gesto. Se queda en silencio y el
           botón de la burbuja sigue disponible. */
        currentRef.current = null;
        setPlayingId(null);
      });
    },
    [cancelFade, element],
  );

  /* Progreso y final del clip. Se suscribe una vez al elemento vivo. */
  useEffect(() => {
    const audio = element();
    const onTime = () => {
      if (!audio.duration || !Number.isFinite(audio.duration)) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnd = () => {
      currentRef.current = null;
      setPlayingId(null);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [element]);

  /* Al desmontar: nada sigue sonando fuera de la escena. */
  useEffect(
    () => () => {
      if (settleRef.current) clearTimeout(settleRef.current);
      if (fadeRef.current) clearInterval(fadeRef.current);
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  /**
   * Arma la escena. Debe llamarse DENTRO del manejador del clic: es el gesto
   * lo que desbloquea la política, y arrancar el clip aquí mismo aprovecha
   * ese mismo gesto en vez de esperar al siguiente paso de scroll.
   */
  const arm = useCallback(
    (clip: DemoClip | null) => {
      setArmed(true);
      if (clip) play(clip);
      else void element().play().then(() => element().pause()).catch(() => {});
    },
    [element, play],
  );

  const disarm = useCallback(() => {
    setArmed(false);
    stop(true);
  }, [stop]);

  /** Botón de la burbuja. Un clic es gesto, así que también arma la escena. */
  const toggle = useCallback(
    (clip: DemoClip) => {
      setArmed(true);
      if (currentRef.current === clip.id) stop(true);
      else play(clip);
    },
    [play, stop],
  );

  /**
   * Lo que el scroll pide oír. Se llama en cada cambio de mensaje visible;
   * solo actúa cuando el scroll se asienta y la escena está armada.
   */
  const syncTo = useCallback(
    (clip: DemoClip | null) => {
      if (settleRef.current) clearTimeout(settleRef.current);
      /* Salir del clip se atiende YA: dejar sonando una voz cuyo mensaje ya
         no está en pantalla es lo que se siente descoordinado. */
      if (!clip && currentRef.current !== null) {
        stop(true);
        return;
      }
      if (!clip || !armed || currentRef.current === clip.id) return;
      settleRef.current = setTimeout(() => play(clip), SETTLE_MS);
    },
    [armed, play, stop],
  );

  return { armed, playingId, progress, arm, disarm, toggle, syncTo };
}
