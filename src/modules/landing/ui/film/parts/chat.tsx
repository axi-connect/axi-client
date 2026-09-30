import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/** Una burbuja del hilo: `in` es el cliente, `out` lo que sale del negocio. */
export function Bubble({
  side,
  children,
  meta,
  className,
}: {
  side: "in" | "out";
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", side === "out" ? "items-end" : "items-start", className)} data-anim="msg">
      <div className={cn("film-bub", side === "out" ? "film-bub-out" : "film-bub-in")}>{children}</div>
      {meta ? <div className="film-meta">{meta}</div> : null}
    </div>
  );
}

/** Las nueve láminas del canto: el grosor del titanio, de delante atrás. */
const EDGES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Botones laterales (silencio, volumen, encendido y cámara), en px del cuerpo. */
const KEYS = [
  { side: "l", top: 118, h: 30 },
  { side: "l", top: 170, h: 56 },
  { side: "l", top: 238, h: 56 },
  { side: "r", top: 196, h: 88 },
  { side: "r", top: 420, h: 44 },
] as const;

/**
 * El teléfono del chat (lienzo «Teléfono premium», opción A, aprobada el
 * 2026-09-30): titanio en perspectiva, con canto de nueve láminas en Z, reflejo
 * que cruza el cristal y lo que sale de la pantalla (`overlay`) flotando delante.
 *
 * Es HTML estático en su pose final. El motor mueve la pose (`--rx`, `--ry`,
 * `--rz`, `--ty`, `--tz` del cuerpo), el reflejo, los mensajes y el desplazamiento
 * del hilo del chat; sin motor se ve el último fotograma. Se dibuja a 360 × 740
 * y se escala entero (`--s` en film.css) según el alto de la pantalla.
 *
 * `children` son los mensajes (`data-anim="msg"` con su `data-at`, de 0 a 1 en
 * la escena); `typing` es el «escribiendo…» que el motor muestra entre turnos.
 */
export function Phone({
  title,
  initials,
  time,
  status,
  overlay,
  children,
  className,
}: {
  title: ReactNode;
  initials: ReactNode;
  /** La hora de la barra de estado. */
  time: ReactNode;
  status: string;
  overlay?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("film-phone", className)}>
      <div className="film-phone-stage">
        <div className="film-phone-floor" data-anim="phone-floor" aria-hidden="true" />
        <div className="film-phone-halo" aria-hidden="true" />
        <div className="film-phone-body" data-anim="phone">
          {/* El halo que enciende el hilo de luz al llegar (thread.css). */}
          <div className="film-phone-aura" data-thread-target="" aria-hidden="true" />
          {EDGES.map((i) => (
            <div key={i} className="film-phone-edge" style={{ "--i": i } as React.CSSProperties} aria-hidden="true" />
          ))}
          {KEYS.map((k) => (
            <div key={`${k.side}${k.top}`} className="film-phone-key" data-side={k.side} style={{ top: k.top, height: k.h }} aria-hidden="true" />
          ))}
          <div className="film-phone-frame">
            <div className="film-phone-bezel">
              <div className="film-phone-glass">
                <StatusBar time={time} />
                <div className="film-phone-head">
                  <svg width="10" height="17" viewBox="0 0 10 17" aria-hidden="true">
                    <path d="M8.5 1.5 1.8 8.5l6.7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="film-phone-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold tracking-[-0.01em]">{title}</span>
                    <span className="film-phone-status">
                      <span className="film-phone-online" aria-hidden="true" />
                      <span className="relative">
                        <span data-anim="status-online">{status}</span>
                        <span data-anim="status-typing" className="absolute inset-0 opacity-0" aria-hidden="true">
                          escribiendo…
                        </span>
                      </span>
                    </span>
                  </span>
                </div>
                <div className="film-phone-view">
                  <div className="film-phone-feed" data-anim="feed">
                    <span className="film-phone-day">Hoy</span>
                    {children}
                  </div>
                  <div className="film-phone-typing" data-anim="typing" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <div className="film-phone-compose" aria-hidden="true">
                  <span className="film-phone-plus">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="film-phone-input">Mensaje</span>
                </div>
                <div className="film-phone-home" aria-hidden="true">
                  <span />
                </div>
                <div className="film-phone-glare" data-anim="glare" aria-hidden="true" />
              </div>
            </div>
          </div>
          {overlay}
        </div>
      </div>
    </div>
  );
}

/** La barra de estado del teléfono: hora, isla, señal, wifi y batería. */
function StatusBar({ time }: { time: ReactNode }) {
  return (
    <div className="film-phone-bar" aria-hidden="true">
      <span className="tabular-nums">{time}</span>
      <span className="film-phone-island">
        <span />
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11">
          <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11">
          <path
            d="M7.5 10.5 5.2 8.2a3.3 3.3 0 0 1 4.6 0Z M3.4 6.4a5.8 5.8 0 0 1 8.2 0l-1.1 1.1a4.2 4.2 0 0 0-6 0Z M1.2 4.2a8.9 8.9 0 0 1 12.6 0l-1.1 1.1a7.4 7.4 0 0 0-10.4 0Z"
            fill="currentColor"
          />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x=".5" y=".5" width="22" height="11" rx="3.4" fill="none" stroke="currentColor" strokeOpacity=".4" />
          <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor" />
          <rect x="23.6" y="4" width="1.6" height="4" rx=".8" fill="currentColor" fillOpacity=".45" />
        </svg>
      </span>
    </div>
  );
}
