import { cleanup, render, screen, within } from "@testing-library/react";
import { KeyResultList } from "../KeyResultList";
import { pace, plan } from "../../__tests__/fixtures";

afterEach(cleanup);

const rowOf = (label: RegExp) => screen.getByText(label).closest("li") as HTMLElement;

describe("KeyResultList", () => {
  it("en F3 las filas NO enlazan (las páginas de detalle no existen); con detailHref sí, en el orden del plan", () => {
    const { rerender } = render(<KeyResultList pace={pace} plan={plan} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);

    rerender(<KeyResultList pace={pace} plan={plan} detailHref={(key) => `/comercial/resultados/${key}`} />);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/comercial/resultados/sales",
      "/comercial/resultados/avg_ticket",
      "/comercial/resultados/quotes",
      "/comercial/resultados/contacted",
      "/comercial/resultados/calls",
    ]);
  });

  it("el badge solo aparece fuera de ritmo; «al ritmo» no lleva nada; behind y at_risk dicen lo mismo", () => {
    render(<KeyResultList pace={pace} plan={plan} />);
    expect(within(rowOf(/ventas cerradas/i)).getByText("Ritmo bajo")).toBeInTheDocument();
    expect(within(rowOf(/^contactados$/i)).queryByText(/Al ritmo|Ritmo bajo/)).toBeNull();
    const calls = rowOf(/llamadas hechas/i);
    expect(within(calls).getByText("Ritmo bajo")).toBeInTheDocument();
    expect(within(calls).getByText("supuesto para clínicas estéticas")).toBeInTheDocument();
    expect(within(calls).getByText("Contestadas 79 de 120")).toBeInTheDocument();
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
    expect(screen.queryByText("Ritmo bajo")).toBeNull();
    expect(screen.getByText("Aún sin historia para medir el ritmo.")).toBeInTheDocument();
  });
});
