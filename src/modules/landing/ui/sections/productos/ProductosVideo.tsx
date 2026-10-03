"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

import { HeroVideo } from "@/modules/landing/ui/components/HeroVideo";
import { HERO_VIDEO, VIDEO_SCENE } from "@/modules/landing/ui/content/productos.content";

/**
 * El reproductor del video del fundador (#video). El `<video>` no existe
 * hasta que la escena se acerca: antes había que bajar el video en el
 * primer pantallazo de la página; ahora va antes del cierre y el póster
 * basta. `HeroVideo` se encarga del resto (sonido, pausa fuera de vista,
 * movimiento reducido y Save-Data).
 */
export function ProductosVideoPlayer() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = el.closest<HTMLElement>("[data-app-scroll]");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { root, rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {near ? (
        <HeroVideo
          desktop={HERO_VIDEO.desktop}
          mobile={HERO_VIDEO.mobile}
          ariaLabel={HERO_VIDEO.ariaLabel}
          soundOnLabel={VIDEO_SCENE.soundOn}
          soundOffLabel={VIDEO_SCENE.soundOff}
          playLabel={VIDEO_SCENE.play}
          className="h-full w-full"
        />
      ) : (
        <>
          <picture>
            <source media="(min-width: 768px)" srcSet={HERO_VIDEO.desktop.poster} />
            <img src={HERO_VIDEO.mobile.poster} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          </picture>
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <span className="grid size-24 place-items-center rounded-full border border-white/35 bg-white/15 backdrop-blur-md">
              <Play className="size-7 text-white" fill="currentColor" />
            </span>
          </span>
        </>
      )}
    </div>
  );
}
