import { render, screen } from "@testing-library/react";

import { InkIsland } from "@/shared/components/features/bento";
import { Island, ISLAND_DEFAULTS, islandClassName } from "@/shared/components/features/island";

describe("islandClassName", () => {
  it("sin nada pide, usa ISLAND_DEFAULTS", () => {
    expect(ISLAND_DEFAULTS).toEqual({ material: "glass", tone: "light", glow: "brand" });
    expect(islandClassName()).toBe("island island-glass surface-light island-glow-brand");
  });

  it("el cristal negro es una superficie oscura", () => {
    expect(islandClassName({ tone: "dark", glow: "ai" })).toBe("island island-glass surface-dark island-glow-ai");
  });

  it("la tinta siempre es oscura, aunque se pida tono claro", () => {
    expect(islandClassName({ material: "ink", tone: "light" })).toBe("island island-ink surface-dark island-glow-brand");
  });

  it("sin brillo no añade clase de brillo", () => {
    expect(islandClassName({ material: "ink", glow: "none" })).toBe("island island-ink surface-dark");
  });
});

describe("Island", () => {
  it("renderiza la etiqueta pedida con sus clases y las de la vista", () => {
    render(
      <Island as="footer" material="ink" aria-label="Estado del envío" className="sticky">
        hola
      </Island>,
    );
    const bar = screen.getByRole("contentinfo", { name: "Estado del envío" });
    expect(bar.tagName).toBe("FOOTER");
    expect(bar).toHaveClass("island", "island-ink", "surface-dark", "sticky");
  });
});

describe("InkIsland", () => {
  it("es una región con nombre, con el aspecto por defecto", () => {
    render(<InkIsland label="Lo próximo">contenido</InkIsland>);
    const region = screen.getByRole("region", { name: "Lo próximo" });
    expect(region).toHaveClass("island-glass", "surface-light", "p-6");
  });

  it("deja elegir otro material por llamada", () => {
    render(
      <InkIsland label="Axi propone" material="glass" tone="dark" glow="ai">
        contenido
      </InkIsland>,
    );
    expect(screen.getByRole("region", { name: "Axi propone" })).toHaveClass("surface-dark", "island-glow-ai");
  });
});
