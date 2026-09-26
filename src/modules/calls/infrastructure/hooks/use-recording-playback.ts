"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PLAYBACK_RATES = [1, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/**
 * Reproducción de la grabación de una llamada terminada (premium F4). Un
 * `Audio` propio en vez del `AudioPlayerCore`: la onda ES la barra de
 * posición y la transcripción salta el audio, así que la posición se lee por
 * `requestAnimationFrame` mientras suena — `timeupdate` llega a ~4 Hz y el
 * cursor y la palabra resaltada irían a saltos.
 *
 * `url=null` todavía: `toggle` y `seek` quedan pendientes y se aplican cuando
 * llegue. `onError` avisa que el audio falló con esa URL (firmada y vencida).
 */
export function useRecordingPlayback(
  url: string | null,
  { onError }: { onError?: () => void } = {},
): {
  playing: boolean;
  positionMs: number;
  durationMs: number | null;
  rate: PlaybackRate;
  toggle: () => void;
  seek: (ms: number) => void;
  setRate: (rate: PlaybackRate) => void;
} {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [rate, setRateState] = useState<PlaybackRate>(1);

  // Un solo <audio> por vista, fuera del DOM.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setPositionMs(audio.duration * 1000);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDurationMs(audio.duration * 1000);
      if (pendingSeekRef.current !== null) {
        audio.currentTime = pendingSeekRef.current / 1000;
        pendingSeekRef.current = null;
      }
    };
    const onFail = () => {
      setPlaying(false);
      onErrorRef.current?.();
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("error", onFail);
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("error", onFail);
      audio.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null || url === null) return;
    // Una URL fresca (la anterior venció) conserva la posición.
    if (audio.src !== "" && pendingSeekRef.current === null) {
      pendingSeekRef.current = audio.currentTime * 1000;
    }
    audio.src = url;
    audio.playbackRate = rate;
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      void audio.play().catch(() => setPlaying(false));
    }
    // `rate` se aplica en su propio efecto; aquí solo al cambiar de URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (audioRef.current !== null) audioRef.current.playbackRate = rate;
  }, [rate]);

  // Reloj fino mientras suena.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio !== null) setPositionMs(audio.currentTime * 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (audio === null) return;
    if (audio.src === "") {
      pendingPlayRef.current = !pendingPlayRef.current;
      return;
    }
    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0;
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((ms: number) => {
    const value = Math.max(0, ms);
    const audio = audioRef.current;
    setPositionMs(value);
    if (audio === null || audio.src === "" || audio.readyState === 0) {
      pendingSeekRef.current = value;
      return;
    }
    audio.currentTime = value / 1000;
  }, []);

  const setRate = useCallback((next: PlaybackRate) => setRateState(next), []);

  return { playing, positionMs, durationMs, rate, toggle, seek, setRate };
}
