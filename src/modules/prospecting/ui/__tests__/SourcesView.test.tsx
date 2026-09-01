import { render, screen } from "@testing-library/react";

import type { SourceCatalogItemDTO } from "../../domain/search";
import { listSources } from "../../infrastructure/services/prospecting-service.adapter";
import { SourcesView } from "../SourcesView";

/**
 * Este fichero nace de un informe del dueño: «en esta lista de fuentes
 * OpenStreetMap se ve de un color opaco, como deshabilitado, cuando es gratis y
 * está activo».
 *
 * No era un problema de color: la vitrina pasaba `inert` a las TRES tarjetas
 * —solo porque ninguna es clicable— y `ProviderCard` atenúa al 70 % lo que sea
 * `inert`. Una fuente gratis y funcionando se pintaba exactamente igual que una
 * que la plataforma no ha encendido, que es la única cosa que la opacidad tenía
 * que comunicar.
 */

jest.mock("../../infrastructure/services/prospecting-service.adapter", () => ({
  listSources: jest.fn(),
}));

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

const listSourcesMock = listSources as jest.MockedFunction<typeof listSources>;

function source(overrides: Partial<SourceCatalogItemDTO> = {}): SourceCatalogItemDTO {
  return {
    source: "openstreetmap",
    provider: "overpass",
    label: "OpenStreetMap",
    available: true,
    unavailable_reason: null,
    free: true,
    allowed_channels: ["email"],
    attribution: "© Colaboradores de OpenStreetMap (ODbL)",
    ...overrides,
  } as SourceCatalogItemDTO;
}

async function renderWith(items: SourceCatalogItemDTO[]) {
  listSourcesMock.mockResolvedValue({ items, categories: [] });
  render(<SourcesView />);
  return screen.findByText(items[0].label);
}

/** La tarjeta es el ancestro que lleva la clase de superficie. */
function cardOf(label: string): HTMLElement {
  const card = screen.getByText(label).closest(".channel-surface");
  if (card === null) throw new Error(`Sin tarjeta para ${label}`);
  return card as HTMLElement;
}

describe("SourcesView · atenuar significa «apagada»", () => {
  it("EL BUG: una fuente gratis y activa NO se pinta atenuada", async () => {
    await renderWith([source()]);

    const card = cardOf("OpenStreetMap");
    expect(card.className).not.toContain("opacity-70");
    // Ni se anuncia como deshabilitada a quien usa lector de pantalla.
    expect(card).not.toHaveAttribute("aria-disabled");
  });

  it("una fuente que la plataforma no encendió SÍ se atenúa: ahí sí significa algo", async () => {
    await renderWith([
      source({ available: false, unavailable_reason: "no_account", free: false }),
    ]);

    const card = cardOf("OpenStreetMap");
    expect(card.className).toContain("opacity-70");
    expect(card).toHaveAttribute("aria-disabled", "true");
  });

  it("dice POR QUÉ no está disponible, no solo que no lo está", async () => {
    // Antes los cuatro motivos compartían la misma frase, y el desplegable de
    // búsqueda hacía desaparecer la fuente sin decir nada.
    await renderWith([source({ available: false, unavailable_reason: "capped_day" })]);

    expect(await screen.findByText(/tope de consultas de hoy/i)).toBeInTheDocument();
  });

  it("el aviso de la ODbL sobrevive al motivo: es una obligación de licencia", async () => {
    await renderWith([source({ available: false, unavailable_reason: "disabled" })]);

    expect(await screen.findByText(/Colaboradores de OpenStreetMap/)).toBeInTheDocument();
  });
});
