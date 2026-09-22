import { fireEvent, render, screen } from "@testing-library/react";

import {
  A4_WIDTH_PX,
  TemplatePreviewFrame,
  fitZoom,
  withHostFonts,
} from "@/modules/documents/ui/components/templates/TemplatePreviewFrame";

describe("fitZoom (ajustar al ancho)", () => {
  it("en un teléfono de 390 puntos ni el 50 % cabe: el zoom por defecto es el que quepa", () => {
    const zoom = fitZoom(390, 0.65);
    expect(zoom).toBeLessThan(0.5);
    expect(A4_WIDTH_PX * zoom).toBeLessThanOrEqual(390 - 32);
  });

  it("en escritorio manda el zoom elegido", () => {
    expect(fitZoom(1200, 0.65)).toBe(0.65);
    expect(fitZoom(1200, 1)).toBe(1);
  });
});

describe("zoom: lo que cabe es UN nivel, no un techo", () => {
  it("acercar desde «ajustada» hace crecer la hoja por encima; alejar vuelve a «ajustada»", () => {
    // En jsdom el contenedor mide 0 → «ajustada» es el mínimo (120 / 794); el
    // primer nivel por encima es el 50 %. Si fitZoom fuera un techo, los
    // cuatro niveles pintarían lo mismo y «Acercar» respondería sin cambiar
    // un píxel (hallazgo del auditor).
    render(
      <TemplatePreviewFrame
        html={withHostFonts(
          "<!doctype html><html><head><style data-fonts></style></head><body>Hola</body></html>",
        )}
        status="ready"
        error={null}
        onRetry={jest.fn()}
      />,
    );
    const frame = screen.getByTitle("Vista previa del documento");
    const scaleOf = () =>
      Number(
        /scale\(([\d.]+)\)/.exec(frame.getAttribute("style") ?? "")?.[1] ?? "0",
      );
    const fitted = scaleOf();
    expect(fitted).toBeGreaterThan(0);
    expect(fitted).toBeLessThan(0.5);
    expect(screen.getByText("Ajustada al ancho")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Alejar la hoja" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Acercar la hoja" }));
    expect(scaleOf()).toBe(0.5);
    expect(screen.getByText("50 %")).toBeInTheDocument();
    expect(A4_WIDTH_PX * scaleOf()).toBeGreaterThan(120);

    fireEvent.click(screen.getByRole("button", { name: "Alejar la hoja" }));
    expect(scaleOf()).toBe(fitted);
    expect(screen.getByText("Ajustada al ancho")).toBeInTheDocument();
  });
});

describe("TemplatePreviewFrame", () => {
  it("el contenedor desplaza en vez de recortar, y la hoja sigue ahí con la barra encima cuando algo falla", () => {
    render(
      <TemplatePreviewFrame
        html={withHostFonts(
          "<!doctype html><html><head><style data-fonts></style></head><body>Hola</body></html>",
        )}
        status="error"
        error="Sin red"
        onRetry={jest.fn()}
      />,
    );
    const frame = screen.getByTitle("Vista previa del documento");
    expect(frame).toHaveAttribute("sandbox", "");
    const container = frame.closest(".overflow-x-auto");
    expect(container).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Sin red");
    expect(
      screen.getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
  });
});
