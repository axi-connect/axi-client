"use client";

import { useEffect, useRef, useState } from "react";

import { FILM_VIDEO } from "@/modules/landing/domain/film/video-content";

type Sources = { mp4: string; poster: string };

/**
 * El video de la película (plan §23): Cloudinary en streaming progresivo, sin
 * librerías ni framer-motion (no entra en el JS de /).
 *
 * - Nada se pide hasta que la escena está a una pantalla (IntersectionObserver
 *   sobre el contenedor de scroll): ni el póster ni el video compiten con el LCP.
 * - Escritorio/móvil en el MISMO umbral que /productos (768 px): cada máster con
 *   su póster, elegido tras hidratar.
 * - Autoplay en silencio y en bucle; se pausa fuera de pantalla y con la pestaña
 *   oculta. «Activar sonido» reinicia el video para que el mensaje se oiga entero.
 * - Movimiento reducido o ahorro de datos: póster y «Reproducir», sin autoplay.
 */
export function FilmVideo({ desktop, mobile }: { desktop: Sources; mobile: Sources }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<Sources | null>(null);
  const [auto, setAuto] = useState(true);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  // Cerca de la pantalla: elegir máster y política de reproducción.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        const save = Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData);
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setAuto(!save && !calm);
        setSrc(window.matchMedia("(min-width: 768px)").matches ? desktop : mobile);
      },
      // La raíz es el contenedor de scroll de la capa pública: con la del
      // viewport, el recorte del contenedor anulaba el margen y el video se
      // pedía tarde (pantalla negra al llegar).
      { root: video.closest("[data-app-scroll]"), rootMargin: "100% 0px" },
    );
    near.observe(video);
    return () => near.disconnect();
  }, [desktop, mobile]);

  // En pantalla suena (si puede); fuera de ella o con la pestaña oculta, pausa.
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    video.load();
    let visible = false;
    const sync = () => {
      if (visible && !document.hidden && (auto || started)) video.play().catch(() => undefined);
      else video.pause();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        sync();
      },
      { threshold: 0.15 },
    );
    io.observe(video);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [src, auto, started]);

  const sound = () => {
    const video = ref.current;
    if (!video) return;
    if (muted) video.currentTime = 0;
    video.muted = !muted;
    setMuted(!muted);
    setStarted(true);
    video.play().catch(() => undefined);
  };

  const play = () => {
    setStarted(true);
    ref.current?.play().catch(() => undefined);
  };

  const playing = auto || started;
  return (
    <>
      {failed ? null : (
        <video
          ref={ref}
          className="film-video-media"
          muted
          loop
          playsInline
          preload="none"
          poster={src?.poster}
          aria-label={FILM_VIDEO.label}
          onError={() => setFailed(true)}
        >
          {src ? <source src={src.mp4} type="video/mp4" /> : null}
        </video>
      )}
      {src && !failed ? (
        playing ? (
          <button type="button" className="film-video-pill" data-on={muted ? undefined : ""} aria-pressed={!muted} onClick={sound}>
            <span className="film-video-eq" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            {muted ? FILM_VIDEO.soundOn : FILM_VIDEO.soundOff}
          </button>
        ) : (
          <button type="button" className="film-video-pill film-video-play" onClick={play}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
            {FILM_VIDEO.play}
          </button>
        )
      ) : null}
    </>
  );
}
