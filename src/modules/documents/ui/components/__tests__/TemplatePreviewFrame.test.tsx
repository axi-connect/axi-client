import { render, screen } from "@testing-library/react";

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
