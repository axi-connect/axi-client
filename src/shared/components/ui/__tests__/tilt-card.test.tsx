import { render } from "@testing-library/react";
import { TiltCard } from "../tilt-card";

/**
 * Smoke test de la guarda de accesibilidad, no del efecto.
 *
 * El efecto NO se puede testear aquí y no se intenta: `getBoundingClientRect`
 * devuelve todo a `0` en jsdom, así que la matemática del tilt daría `NaN`, y
 * verificarla obligaría a doblar el rect y el `requestAnimationFrame` — con lo
 * que se estaría comprobando el doble, no el navegador. Lo que sí importa
 * blindar es que en un móvil no se enganche nada: son diez tarjetas en la app.
 */
const realMatchMedia = window.matchMedia;

function stubMatchMedia(matches: (query: string) => boolean) {
  window.matchMedia = ((query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe("TiltCard", () => {
  it("pinta a sus hijos y propaga el radio al envoltorio", () => {
    // El radio del envoltorio es contrato, no estilo: el brillo recorta con
    // `rounded-[inherit]`, así que sin él las esquinas cuadradas del reflejo
    // asoman iluminadas por fuera de la tarjeta.
    const { container, getByText } = render(
      <TiltCard className="rounded-[26px]">
        <p>contenido</p>
      </TiltCard>,
    );

    expect(getByText("contenido")).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain("rounded-[26px]");
  });

  /**
   * Se cuentan `pointerenter`/`pointerleave` y no «todo lo que empiece por
   * pointer»: React engancha sus propios delegados en la raíz
   * (`pointermove`, `pointerdown`, `pointerover`…) y contaminarían la cuenta.
   * Esos dos no burbujean, así que React no los usa — si aparecen, son de aquí.
   */
  function countOwnListeners(): number {
    const spy = jest.spyOn(HTMLElement.prototype, "addEventListener");
    render(
      <TiltCard>
        <p>contenido</p>
      </TiltCard>,
    );
    const own = spy.mock.calls.filter(([type]) =>
      type === "pointerenter" || type === "pointerleave",
    ).length;
    spy.mockRestore();
    return own;
  }

  it("con puntero fino engancha el efecto", () => {
    stubMatchMedia(() => false);
    expect(countOwnListeners()).toBe(2);
  });

  it("en un dispositivo sin puntero fino no engancha nada", () => {
    // Diez tarjetas en la app: en un móvil el efecto no debe existir, ni a
    // medias. Es la guarda que ahorra el rAF y el reflow en el táctil.
    stubMatchMedia((query) => query.includes("hover: none"));
    expect(countOwnListeners()).toBe(0);
  });
});
