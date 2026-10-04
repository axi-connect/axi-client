import type { CSSProperties, ReactNode, Ref } from "react";

/** El canto: nueve láminas en Z, como el teléfono premium de la home. */
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
 * El teléfono de /productos: el mismo titanio, canto en láminas, isla
 * dinámica y reflejo del teléfono premium de la home (lienzo «Teléfono
 * premium», opción A), dibujado a 360 × 740 y escalado entero con `--s`.
 *
 * Es UNO solo en la página: vive en el juego y `usePhoneFlight` lo lleva
 * desde la luz del hero hasta su sitio. `flightRef` recibe el traslado y
 * `bodyRef` la pose (transform directo, sin variables: no recalcula el
 * subárbol en cada frame).
 */
export function ProductosPhone({
  children,
  head,
  compose,
  slotRef,
  flightRef,
  bodyRef,
}: {
  children: ReactNode;
  head: ReactNode;
  compose: ReactNode;
  slotRef?: Ref<HTMLDivElement>;
  flightRef?: Ref<HTMLDivElement>;
  bodyRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={slotRef} className="pj-ph">
      <div ref={flightRef} className="pj-ph-flight">
        <div className="pj-ph-rise">
          <div className="pj-ph-stage">
            <div className="pj-ph-floor" aria-hidden="true" />
            <div ref={bodyRef} className="pj-ph-body">
              {EDGES.map((i) => (
                <div key={i} className="pj-ph-edge" style={{ "--i": i } as CSSProperties} aria-hidden="true" />
              ))}
              {KEYS.map((k) => (
                <div key={`${k.side}${k.top}`} className="pj-ph-key" data-side={k.side} style={{ top: k.top, height: k.h }} aria-hidden="true" />
              ))}
              <div className="pj-ph-frame">
                <div className="pj-ph-bezel">
                  <div className="pj-ph-glass">
                    <StatusBar />
                    {head}
                    {children}
                    {compose}
                    <div className="pj-ph-home" aria-hidden="true">
                      <span />
                    </div>
                    <div className="pj-ph-glare" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** La barra de estado: hora, isla dinámica, señal, wifi y batería. */
function StatusBar() {
  return (
    <div className="pj-ph-bar" aria-hidden="true">
      <span className="tabular-nums">9:41</span>
      <span className="pj-ph-island">
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
