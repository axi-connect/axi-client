"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Play, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useScrollContainer } from "@/modules/landing/ui/components/use-scroll-container";

/**
 * Una sola fuente H.264 a propósito. Antes se ofrecía además un WebM/VP9 y,
 * al ir primero, era el que elegían Chrome y Firefox — pero Cloudinary lo
 * comprimía mucho más (0,59 Mbps frente a 1,09 del H.264 con `q_auto`), así
 * que la mayoría de visitantes veía la peor de las dos copias. Ni pidiendo
 * `q_auto:best` alcanzaba paridad. El ahorro del VP9 no venía de comprimir
 * mejor sino de comprimir más: se retiró.
 */
export interface HeroVideoSources {
  mp4: string;
}

/**
 * Video de hero en streaming progresivo (Cloudinary sirve con HTTP range).
 *
 * Audio — el mensaje es lo importante (decisión del dueño):
 * - Al montar se intenta el autoplay CON sonido. Donde la política del
 *   navegador lo permita (engagement previo, ajustes del sitio), el video
 *   suena de entrada. Si el navegador lo veta —el caso común— cae a autoplay
 *   silenciado sin romper nada.
 * - El control de sonido es un pill glass con ecualizador vivo cuando suena;
 *   al ACTIVAR el sonido el video reinicia desde el principio, para que el
 *   mensaje se escuche completo, no desde la mitad del loop.
 *
 * Plomería que costó un bug: las `<source>` se montan tras la hidratación
 * (elección desktop/móvil con matchMedia), y añadir sources a un `<video>` ya
 * montado NO relanza la selección de recurso — hay que llamar `load()`
 * explícito o el video no carga jamás.
 *
 * Rendimiento y resiliencia: el LCP es lo que haya debajo del video (el
 * `BrandGradientCanvas` de la sección), que es también su respaldo si el
 * asset falla; pausa fuera de viewport (IO sobre `[data-app-scroll]`);
 * `prefers-reduced-motion`/Save-Data ⇒ sin autoplay, botón de reproducción.
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

  /* Arranque: load() explícito y autoplay con sonido → fallback silenciado. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sources) return;
    video.load();
    if (!autoplayAllowed) return;
    video.muted = false;
    video
      .play()
      .then(() => {
        setMuted(false);
        setStarted(true);
      })
      .catch(() => {
        video.muted = true;
        setMuted(true);
        void video
          .play()
          .then(() => setStarted(true))
          .catch(() => {});
      });
  }, [sources, autoplayAllowed]);

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
    if (muted) {
      /* Encender el sonido reinicia el mensaje: se escucha desde el hola. */
      video.currentTime = 0;
      video.muted = false;
      setMuted(false);
    } else {
      video.muted = true;
      setMuted(true);
    }
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

      {/* Control de sonido: por encima de la barra de stats (z + bottom), con
          ecualizador vivo cuando el mensaje está sonando. */}
      {showVideo ? (
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          className={cn(
            "glass focus-visible:ring-ring pointer-events-auto absolute right-6 bottom-20 z-20 flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-4 text-[13px] font-medium transition-all focus-visible:ring-2 focus-visible:outline-none md:right-8 md:bottom-24",
            !muted && "border-brand/40",
          )}
        >
          {muted ? (
            <VolumeX aria-hidden className="size-4" />
          ) : (
            <span aria-hidden className="flex h-4 items-end gap-[3px]">
              <span className="animate-sound-eq bg-brand w-[3px] rounded-full" style={{ height: "100%" }} />
              <span className="animate-sound-eq bg-brand w-[3px] rounded-full" style={{ height: "100%", animationDelay: "0.22s" }} />
              <span className="animate-sound-eq bg-brand w-[3px] rounded-full" style={{ height: "100%", animationDelay: "0.44s" }} />
            </span>
          )}
          {muted ? soundOnLabel : soundOffLabel}
          {muted ? null : <Volume2 aria-hidden className="text-brand size-4" />}
        </button>
      ) : null}
    </div>
  );
}
