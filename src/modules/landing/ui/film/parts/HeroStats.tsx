"use client";

import { useEffect, useRef } from "react";
import { Clock, Gift, MessagesSquare, Wrench, type LucideIcon } from "lucide-react";

/**
 * Las cuatro cifras del pie del hero. Son hechos del producto, no métricas de
 * vanidad ni números inventados (DESIGN.md §7.1): atiende todo el día, el
 * agente trabaja con 18 herramientas (knowledge-base §6.2), vende por tres
 * canales y se prueba 7 días gratis.
 *
 * El HTML trae la cifra final (buscadores, sin JS, movimiento reducido). Con
 * JS cuentan desde cero una sola vez; mientras tanto están ocultas por la
 * entrada escalonada del hero, así que el cambio a 0 no se ve.
 */
const STATS: readonly { Icon: LucideIcon; value: number; suffix: string; label: string }[] = [
  { Icon: Clock, value: 24, suffix: "/7", label: "Atiende sin pausa" },
  { Icon: Wrench, value: 18, suffix: "", label: "Herramientas del agente" },
  { Icon: MessagesSquare, value: 3, suffix: "", label: "Canales: WhatsApp, Instagram y Messenger" },
  { Icon: Gift, value: 7, suffix: " días", label: "De prueba, sin tarjeta" },
];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function HeroStats() {
  const ref = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const values = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));
    values.forEach((el) => (el.textContent = "0"));
    const frames: number[] = [];
    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        values.forEach((el, i) => {
          const target = Number(el.dataset.count);
          const duration = 1500 + i * 80;
          timers.push(
            window.setTimeout(() => {
              const t0 = performance.now();
              const tick = (now: number) => {
                const k = Math.min(1, (now - t0) / duration);
                el.textContent = String(Math.round(target * easeOutCubic(k)));
                if (k < 1) frames.push(requestAnimationFrame(tick));
              };
              frames.push(requestAnimationFrame(tick));
            }, 480 + i * 90),
          );
        });
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      frames.forEach((f) => cancelAnimationFrame(f));
      values.forEach((el) => (el.textContent = el.dataset.count ?? ""));
    };
  }, []);

  return (
    <dl ref={ref} className="grid w-full max-w-[920px] grid-cols-4 gap-6 max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-5">
      {STATS.map(({ Icon, value, suffix, label }, i) => (
        <div key={label} className="film-in flex flex-col items-center gap-1.5 text-center" style={{ "--d": `${0.5 + i * 0.08}s` } as React.CSSProperties}>
          <Icon className="size-[clamp(20px,2.4vw,26px)] text-foreground" strokeWidth={1.6} aria-hidden="true" />
          {/* En el DOM el término va antes que su valor (semántica de <dl>); el orden visual lo pone flex. */}
          <dt className="film-dim order-3 text-[clamp(11px,1.2vw,12.5px)] leading-snug">{label}</dt>
          <dd className="film-h order-2 text-[clamp(18px,2.2vw,26px)] tabular-nums">
            <span data-count={value}>{value}</span>
            {suffix}
          </dd>
        </div>
      ))}
    </dl>
  );
}
