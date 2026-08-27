"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Play, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useScrollContainer } from "@/modules/landing/ui/components/use-scroll-container";

export interface HeroVideoSources {
  webm: string;
  mp4: string;
}

/**
 * Video de hero en streaming progresivo (Cloudinary sirve con HTTP range):
 * autoplay SIEMPRE silenciado —los navegadores bloquean autoplay con audio— y
 * botón «Activar sonido» cuyo clic, por ser gesto del usuario, legaliza el
 * audio sin recargar nada.
 *
 * Rendimiento y resiliencia:
 * - Las `<source>` se montan tras la hidratación (elige desktop/móvil con
 *   `matchMedia` una sola vez): el LCP es lo que haya DEBAJO del video (el
 *   `BrandGradientCanvas` de la sección), nunca el video. El video entra con
 *   un fade cuando ya puede reproducir; si el asset no existe o falla, el
 *   componente queda invisible y el fondo de marca sostiene el hero.
 * - Se pausa al salir del viewport (IntersectionObserver sobre el scroller
 *   `[data-app-scroll]`) y reanuda al volver.
 * - Con `prefers-reduced-motion` o `Save-Data` no hay autoplay: botón de
 *   reproducción explícito.
 */
export function HeroVideo({
  desktop,
  mobile,
  poster,
  ariaLabel,
  soundOnLabel,
  soundOffLabel,
  playLabel,
  className,
}: {
  desktop: HeroVideoSources;
  mobile: HeroVideoSources;
  poster: string;
  ariaLabel: string;
  soundOnLabel: string;
  soundOffLabel: string;
  playLabel: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { containerRef, ready } = useScrollContainer();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /** null = aún no hidratado (no se montan las <source> en SSR). */
  const [sources, setSources] = useState<HeroVideoSources | null>(null);
  const [autoplayAllowed, setAutoplayAllowed] = useState(true);
  const [canPlay, setCanPlay] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const saveData =
      "connection" in navigator &&
      Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData);
    setAutoplayAllowed(!reduced && !saveData);
    setSources(window.matchMedia("(max-width: 768px)").matches ? mobile : desktop);
  }, [reduced, desktop, mobile]);

  /* Pausa fuera de viewport / reanuda al volver (solo si ya arrancó). */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready || !sources) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
        } else if (autoplayAllowed || started) {
          void video.play().catch(() => {});
        }
      },
      { root: containerRef.current, threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [ready, sources, autoplayAllowed, started, containerRef]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next ? true : false;
    setMuted(next);
    /* El gesto también sirve para (re)arrancar si el autoplay fue denegado. */
    void video.play().catch(() => {});
    setStarted(true);
  };

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    void video.play().catch(() => {});
  };

  if (failed) return null;

  const showVideo = canPlay && (autoplayAllowed || started);

  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        autoPlay={autoplayAllowed}
        aria-label={ariaLabel}
        onCanPlay={() => setCanPlay(true)}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-700",
          showVideo ? "opacity-100" : "opacity-0",
        )}
      >
        {sources ? (
          <>
            <source src={sources.webm} type="video/webm" />
            <source src={sources.mp4} type="video/mp4" />
          </>
        ) : null}
      </video>

      {/* Reproducción explícita cuando el autoplay está vetado (reduced/save-data). */}
      {!autoplayAllowed && !started && sources ? (
        <button
          type="button"
          onClick={startPlayback}
          className="glass focus-visible:ring-ring pointer-events-auto absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-full px-5 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          <Play aria-hidden className="size-4" />
          {playLabel}
        </button>
      ) : null}

      {/* Control de sonido: visible solo cuando el video ya está en pantalla. */}
      {showVideo ? (
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          className="glass focus-visible:ring-ring pointer-events-auto absolute right-6 bottom-6 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none md:right-8"
        >
          {muted ? (
            <VolumeX aria-hidden className="size-4" />
          ) : (
            <Volume2 aria-hidden className="text-brand size-4" />
          )}
          {muted ? soundOnLabel : soundOffLabel}
        </button>
      ) : null}
    </div>
  );
}
