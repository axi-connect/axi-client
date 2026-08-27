"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { spring } from "@/core/styles/motion";
import type { CapabilityItem } from "@/modules/landing/ui/content/productos.content";

const RADIUS_Y = 96;
const AUTOPLAY_MS = 4200;

/**
 * Carrusel elíptico 3D de las capacidades del producto: las tarjetas orbitan
 * en una elipse (solo `transform`/`opacity`, física de marca) con contador
 * central, flechas, puntos y teclado. Cada tarjeta es un `<a>` a su ancla —
 * el carrusel es también el índice de la página.
 *
 * Autoplay pausado con hover/foco. Con `prefers-reduced-motion` (o hasta que
 * el cliente hidrata) degrada a una rejilla estática con los mismos enlaces.
 *
 * Semántica deliberada (DESIGN-SYSTEM §9.3): esto NO son pestañas (no hay
 * `tabpanel`) — los puntos son botones con `aria-label` y el activo se marca
 * con `aria-current`.
 */
export function CircularCarousel({
  items,
  className,
}: {
  items: readonly CapabilityItem[];
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (reduced || !mounted) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {items.map((item) => (
          <CapabilityCard key={item.id} item={item} active={false} />
        ))}
      </div>
    );
  }
  return <OrbitCarousel items={items} className={className} />;
}

function OrbitCarousel({
  items,
  className,
}: {
  items: readonly CapabilityItem[];
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [radiusX, setRadiusX] = useState(280);
  const total = items.length;

  const goTo = useCallback(
    (index: number) => setActive(((index % total) + total) % total),
    [total],
  );

  /* Radio horizontal según el ancho real del escenario (resize-safe). */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setRadiusX(Math.min(300, stage.clientWidth * 0.42));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /* Autoplay, pausado por hover/foco. */
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, total]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") goTo(active - 1);
    if (event.key === "ArrowRight") goTo(active + 1);
  };

  return (
    <div
      className={cn("flex flex-col items-center gap-10", className)}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Capacidades del producto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div ref={stageRef} className="relative h-[320px] w-full max-w-[760px]">
        {items.map((item, i) => {
          /* Offset circular más corto respecto a la activa. */
          let offset = i - active;
          if (offset > total / 2) offset -= total;
          if (offset < -total / 2) offset += total;

          const angle = (offset / 5) * Math.PI;
          const x = Math.sin(angle) * radiusX;
          const y = -Math.cos(angle) * RADIUS_Y;
          const distance = Math.abs(offset);
          const scale = Math.max(0.55, 1 - distance * 0.16);
          const opacity = Math.max(0.16, 1 - distance * 0.34);

          return (
            <motion.div
              key={item.id}
              className="absolute top-1/2 left-1/2 w-[228px]"
              animate={{ x: x - 114, y: y - 78, scale, opacity, zIndex: 20 - distance }}
              transition={spring.soft}
            >
              <CapabilityCard
                item={item}
                active={i === active}
                tabIndex={i === active ? 0 : -1}
                onFocusCard={() => goTo(i)}
              />
            </motion.div>
          );
        })}

        {/* Contador central */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-brand-gradient font-heading text-6xl font-bold tracking-tight tabular-nums">
            {String(active + 1).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground mt-1 text-xs">
            de {String(total).padStart(2, "0")} · {items[active].title}
          </span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-5">
        <CarouselArrow label="Capacidad anterior" onClick={() => goTo(active - 1)}>
          <ChevronLeft aria-hidden className="size-5" />
        </CarouselArrow>
        <div className="flex items-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Ver ${item.title}`}
              aria-current={i === active}
              onClick={() => goTo(i)}
              className={cn(
                "focus-visible:ring-ring h-1.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none",
                i === active ? "bg-brand w-6" : "bg-foreground/20 hover:bg-foreground/40 w-1.5",
              )}
            />
          ))}
        </div>
        <CarouselArrow label="Capacidad siguiente" onClick={() => goTo(active + 1)}>
          <ChevronRight aria-hidden className="size-5" />
        </CarouselArrow>
      </div>
    </div>
  );
}

function CarouselArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="border-border bg-secondary/60 hover:bg-secondary focus-visible:ring-ring flex size-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function CapabilityCard({
  item,
  active,
  tabIndex,
  onFocusCard,
}: {
  item: CapabilityItem;
  active: boolean;
  tabIndex?: number;
  onFocusCard?: () => void;
}) {
  return (
    <a
      href={item.href}
      tabIndex={tabIndex}
      onFocus={onFocusCard}
      className={cn(
        "border-border bg-card shadow-overlay focus-visible:ring-ring flex min-h-[148px] flex-col items-start gap-2.5 rounded-2xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none",
        active ? "border-brand/40" : "hover:border-brand/25",
      )}
    >
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] uppercase",
          active ? "bg-brand/15 text-brand" : "bg-secondary text-muted-foreground",
        )}
      >
        {item.tag}
      </span>
      <span className={cn("font-semibold", active ? "text-base" : "text-sm")}>{item.title}</span>
      <span className="text-muted-foreground text-xs leading-relaxed">{item.description}</span>
    </a>
  );
}
