import { cleanup, render, screen, within } from "@testing-library/react";
import { KeyResultList } from "../KeyResultList";
import { pace, plan } from "../../__tests__/fixtures";

afterEach(cleanup);

describe("KeyResultList", () => {
  it("cada fila es un enlace a su detalle, en el orden del plan y con el ticket tras las ventas", () => {
    render(<KeyResultList pace={pace} plan={plan} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/comercial/resultados/sales",
      "/comercial/resultados/avg_ticket",
      "/comercial/resultados/quotes",
      "/comercial/resultados/contacted",
      "/comercial/resultados/calls",
    ]);
  });

  it("el badge solo aparece fuera de ritmo; «al ritmo» no lleva nada", () => {
    render(<KeyResultList pace={pace} plan={plan} />);
    const sales = screen.getByRole("link", { name: /ventas cerradas/i });
    expect(within(sales).getByText("Atrasado")).toBeInTheDocument();
    const contacted = screen.getByRole("link", { name: /contactados/i });
    expect(within(contacted).queryByText(/Al ritmo|Ritmo bajo|Atrasado/)).toBeNull();
    const calls = screen.getByRole("link", { name: /llamadas/i });
    expect(within(calls).getByText("Ritmo bajo")).toBeInTheDocument();
    expect(within(calls).getByText("supuesto para clínicas estéticas")).toBeInTheDocument();
  });

  it("las cifras son camino recorrido, y el mix va bajo «Ventas»", () => {
    render(<KeyResultList pace={pace} plan={plan} />);
    expect(screen.getByText("27 de 43 · faltan 16")).toBeInTheDocument();
    expect(screen.getByText(/Mix sugerido: 45 % Limpieza facial · 30 % Toxina · 25 % Otros/)).toBeInTheDocument();
    expect(screen.getByText(/Ritmo 1,35 al día · esperado 1,65/)).toBeInTheDocument();
  });

  it("aprendiendo: sin ritmo ni badges, solo la procedencia", () => {
    render(<KeyResultList pace={pace} plan={plan} learning />);
    expect(screen.queryByText(/Ritmo 1,35/)).toBeNull();
    expect(screen.queryByText("Atrasado")).toBeNull();
    expect(screen.getByText("Aún sin historia para medir el ritmo.")).toBeInTheDocument();
  });
});
