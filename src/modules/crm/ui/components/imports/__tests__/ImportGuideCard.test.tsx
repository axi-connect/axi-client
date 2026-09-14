import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImportGuideCard } from "../ImportGuideCard";

afterEach(cleanup);

const props = () => ({
  onDownloadTemplate: jest.fn(),
  onSkip: jest.fn(),
  onContinue: jest.fn(),
});

describe("ImportGuideCard (tarjeta guía del import)", () => {
  it("lista las 7 columnas con su exigencia y ejemplo, y el formato con sus límites", () => {
    render(<ImportGuideCard {...props()} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(7);
    expect(rows[2]?.textContent).toContain("telefono");
    expect(rows[2]?.textContent).toContain("Requerida*");
    expect(rows[2]?.textContent).toContain("3001234567");
    expect(rows[6]?.textContent).toContain("etapa");
    expect(screen.getByText("CSV o XLSX")).toBeInTheDocument();
    expect(screen.getByText(/Máximo 10 MB · 20.000 filas/)).toBeInTheDocument();
  });

  it("«Entendido» devuelve si se marcó «No volver a mostrar»; «Ahora no» y la plantilla llaman a lo suyo", () => {
    const p = props();
    render(<ImportGuideCard {...p} />);

    fireEvent.click(screen.getByRole("button", { name: /entendido/i }));
    expect(p.onContinue).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByLabelText(/no volver a mostrar/i));
    fireEvent.click(screen.getByRole("button", { name: /entendido/i }));
    expect(p.onContinue).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: /ahora no/i }));
    expect(p.onSkip).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /descargar plantilla/i }));
    expect(p.onDownloadTemplate).toHaveBeenCalledTimes(1);
  });

  it("abierta desde el paso archivo: «Volver» y sin la casilla", () => {
    render(<ImportGuideCard {...props()} skipLabel="Volver" showDontShowAgain={false} />);
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/no volver a mostrar/i)).toBeNull();
  });
});
