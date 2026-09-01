import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { DiscoveryCategoryDTO, SourceCatalogItemDTO } from "../../../domain/search";
import { startSearch } from "../../../infrastructure/services/prospecting-service.adapter";
import { StartSearchSheet } from "../StartSearchSheet";

/**
 * A cada fuente se le pregunta con su formulario.
 *
 * Nace de un informe del dueño: el buscador web usaba el formulario de un mapa
 * —categoría del diccionario de OSM, punto y radio— y Serper **ignora los
 * tres**. De todo eso solo se colaba el nombre de la ciudad dentro de la
 * consulta, y así se guardaron dos artículos de prensa como si fueran negocios.
 */

jest.mock("../../../infrastructure/services/prospecting-service.adapter", () => ({
  startSearch: jest.fn(),
  geocode: jest.fn(() => Promise.resolve({ items: [] })),
}));

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

// El panel real portaliza y anima; el molde de la casa es simularlo y afirmar el
// CONTENIDO, que es lo que aquí se prueba.
jest.mock("@/shared/components/ui/sheet", () => {
  function passthrough(tag: keyof React.JSX.IntrinsicElements, name: string) {
    const Passthrough = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(tag, null, children);
    Passthrough.displayName = name;
    return Passthrough;
  }
  const Sheet = ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
    open ? React.createElement("div", { role: "dialog" }, children) : null;
  Sheet.displayName = "Sheet";
  return {
    Sheet,
    SheetContent: passthrough("div", "SheetContent"),
    SheetHeader: passthrough("div", "SheetHeader"),
    SheetTitle: passthrough("h2", "SheetTitle"),
    SheetDescription: passthrough("p", "SheetDescription"),
    SheetFooter: passthrough("div", "SheetFooter"),
  };
});

const startSearchMock = startSearch as jest.MockedFunction<typeof startSearch>;

const CATEGORIES: DiscoveryCategoryDTO[] = [
  { id: "panaderia", label: "Panaderías" },
  { id: "restaurante", label: "Restaurantes" },
];

function source(overrides: Partial<SourceCatalogItemDTO> = {}): SourceCatalogItemDTO {
  return {
    source: "google_places",
    provider: "google_places",
    label: "Google Maps",
    query_shape: "map",
    available: true,
    unavailable_reason: null,
    free: false,
    allowed_channels: ["email"],
    attribution: null,
    ...overrides,
  } as SourceCatalogItemDTO;
}

const WEB = source({
  source: "serp",
  provider: "serper",
  label: "Buscador web",
  query_shape: "web",
});

function renderSheet(sources: SourceCatalogItemDTO[]) {
  render(
    <StartSearchSheet
      open
      sources={sources}
      categories={CATEGORIES}
      onOpenChange={jest.fn()}
      onStarted={jest.fn()}
    />,
  );
}

describe("StartSearchSheet · el formulario lo decide la fuente", () => {
  beforeEach(() => {
    startSearchMock.mockReset();
    startSearchMock.mockResolvedValue({ search_id: "s-1" });
  });

  it("EL BUG: el buscador web pide QUÉ BUSCAR, no una categoría de mapa", () => {
    renderSheet([WEB]);

    expect(screen.getByLabelText("Qué buscas")).toBeInTheDocument();
    // Y no pide lo que la fuente ignora.
    expect(screen.queryByLabelText("Qué negocios")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cuánto a la redonda")).not.toBeInTheDocument();
  });

  it("el formulario del mapa se queda como estaba", () => {
    renderSheet([source()]);

    expect(screen.getByLabelText("Qué negocios")).toBeInTheDocument();
    expect(screen.queryByLabelText("Qué buscas")).not.toBeInTheDocument();
  });

  it("sin texto no deja lanzar la búsqueda web", async () => {
    renderSheet([WEB]);
    fireEvent.click(screen.getByRole("button", { name: /Buscar/ }));

    await waitFor(() => {
      expect(startSearchMock).not.toHaveBeenCalled();
    });
  });

  it("manda el texto del dueño y NO manda radio ni punto", async () => {
    renderSheet([WEB]);
    fireEvent.change(screen.getByLabelText("Qué buscas"), {
      target: { value: "distribuidores de dotación industrial" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Buscar/ }));

    await waitFor(() => {
      expect(startSearchMock).toHaveBeenCalledTimes(1);
    });
    const sent = startSearchMock.mock.calls[0][0];
    expect(sent.text).toBe("distribuidores de dotación industrial");
    expect(sent.radius_m).toBeUndefined();
    expect(sent.center).toBeUndefined();
    // La categoría del diccionario de OSM tampoco: Serper no la entiende.
    expect(sent.category).toBeUndefined();
  });
});
