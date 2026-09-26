import { render, screen } from "@testing-library/react";

import { OriginPill, TagChips } from "../premium";

/**
 * Las etiquetas de la tabla de escenarios: la cadena unida desbordaba la
 * vista. Ahora son a lo sumo dos chips y un «+N» con el resto en el `title`.
 */
describe("TagChips", () => {
  it("muestra dos chips y resume el resto como +N", () => {
    const tags = ["adversarial", "reconocimiento", "imagen", "requiere-imagen", "v2"];
    const { container } = render(<TagChips tags={tags} />);
    expect(screen.getByText("adversarial")).toBeInTheDocument();
    expect(screen.getByText("reconocimiento")).toBeInTheDocument();
    expect(screen.queryByText("imagen")).not.toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("title", tags.join(", "));
  });

  it("sin etiquetas pinta un guion", () => {
    render(<TagChips tags={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("OriginPill", () => {
  it("distingue Sistema de Propio", () => {
    const { rerender } = render(<OriginPill isSystem />);
    expect(screen.getByText("Sistema")).toBeInTheDocument();
    rerender(<OriginPill isSystem={false} />);
    expect(screen.getByText("Propio")).toBeInTheDocument();
  });
});
