import { render, screen } from "@testing-library/react";

import { MapPreview, metersPerPixel, zoomFor } from "../MapPreview";

/**
 * Este fichero nace de una regresión: al arreglar la franja negra del mapa, el
 * mapa se quedó **vacío** — solo el punto, sin errores en consola y sin ninguna
 * petición en la pestaña de red.
 *
 * Fueron dos cosas, y las dos se blindan aquí:
 *
 * 1. El envoltorio de las teselas pasó a medir cero (a propósito: es un ancla en
 *    el centro), y el preflight de Tailwind trae `img { max-width: 100%; height:
 *    auto }`. Ese 100% se resuelve contra el ancla, así que cada tesela salía de
 *    0×0. Y como van con `loading="lazy"`, una imagen de tamaño cero nunca entra
 *    en el visor: el navegador ni la pide. Sin petición no hay fallo, y por eso
 *    la consola y la red estaban limpias. Un error silencioso perfecto.
 * 2. Sin ancho medido no se pintaba ninguna tesela, así que cualquier medida
 *    fallida dejaba el mapa en blanco para siempre.
 *
 * jsdom no calcula CSS, así que aquí no se puede medir un píxel. Lo que sí se
 * puede afirmar es que las teselas existen, que llevan puesto el candado contra
 * la regla del preflight, y que apuntan a donde deben.
 */

const TILES = "https://tile.example.org/{z}/{x}/{y}.png";

function tiles(): HTMLImageElement[] {
  // Las teselas son decorativas (`alt=""`), así que no tienen rol: se buscan por
  // etiqueta, que es lo honesto en vez de ponerles un rol falso.
  return Array.from(document.querySelectorAll("img"));
}

describe("MapPreview", () => {
  it("LA REGRESIÓN: pinta teselas aunque no haya medida del visor", () => {
    // En jsdom `offsetWidth` es 0 SIEMPRE, o sea el mismo caso que dejaba el
    // mapa vacío en el navegador. Un mapa aproximado vale más que uno en blanco.
    render(<MapPreview lat={4.6366} lng={-74.065} label="Chapinero" tileUrl={TILES} />);
    expect(tiles().length).toBeGreaterThan(0);
  });

  it("cada tesela lleva `max-w-none` y su tamaño explícito", () => {
    /*
      EL CANDADO. `max-w-none` desactiva el `img { max-width: 100% }` del
      preflight de Tailwind, que resuelto contra un ancla de tamaño cero dejaba
      las teselas en 0×0 — el mapa vacío del informe. Si alguien quita la clase
      creyendo que es adorno, este test dice por qué estaba.
    */
    render(<MapPreview lat={4.6366} lng={-74.065} label="Chapinero" tileUrl={TILES} />);
    for (const tile of tiles()) {
      expect(tile.className).toContain("max-w-none");
      expect(tile.style.width).toBe("256px");
      expect(tile.style.height).toBe("256px");
    }
  });

  it("las teselas apuntan al proveedor con z/x/y sustituidos", () => {
    render(<MapPreview lat={4.6366} lng={-74.065} label="Chapinero" tileUrl={TILES} />);
    for (const tile of tiles()) {
      expect(tile.getAttribute("src")).toMatch(
        /^https:\/\/tile\.example\.org\/\d+\/\d+\/\d+\.png$/,
      );
    }
  });

  it("el círculo del radio está en el DOM con su diámetro calculado", () => {
    // Dijiste «solo el punto»: esto deja por escrito si el círculo se pinta,
    // en vez de discutirlo sobre una captura. 3 km a zoom 13 en Bogotá ≈ 315 px.
    render(
      <MapPreview
        lat={4.6366}
        lng={-74.065}
        label="Chapinero"
        radiusM={3_000}
        tileUrl={TILES}
      />,
    );
    const expected = Math.round((3_000 / metersPerPixel(4.6366, zoomFor(3_000, false))) * 2);
    const circle = document.querySelector<HTMLElement>("[class*='rounded-full'][class*='border-2']");
    expect(circle).not.toBeNull();
    expect(Math.round(parseFloat(circle?.style.width ?? "0"))).toBe(expected);
  });

  it("la atribución se pinta SIEMPRE: es la condición de uso de las teselas", () => {
    // La ODbL permite el uso comercial citando la fuente. Sin la cita, ese mapa
    // no se puede usar.
    render(<MapPreview lat={4.6366} lng={-74.065} label="Chapinero" tileUrl={TILES} />);
    expect(screen.getByText(/OpenStreetMap/)).toBeInTheDocument();
  });
});
