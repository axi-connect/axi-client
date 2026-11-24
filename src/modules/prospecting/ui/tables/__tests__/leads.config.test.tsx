import { render, screen } from "@testing-library/react";

import type { LeadRow } from "../../../domain/lead";
import { buildLeadColumns } from "../leads.config";

/** Una fila ficticia del tenant de pruebas «Norte Studio». */
function row(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "l-1",
    name: "Hotel Boutique Casa Lumbre",
    contact_line: "+573105550142 · mariana.restrepo@casalumbre.example",
    source: "google_places",
    quality_status: "verified",
    quality_score: 75,
    measured: true,
    axis_contactability: 20,
    axis_identity: 20,
    axis_fit: 20,
    axis_provenance: 15,
    legal_basis: "public_business_data",
    allows_whatsapp: false,
    allows_email: true,
    allows_manual: true,
    has_email: true,
    has_phone: true,
    data_count: 5,
    status: "qualified",
    city: "Bogotá",
    created_at: "2026-11-18T15:00:00.000Z",
    enriched_at: null,
    kind: "business",
    person_line: "",
    decider_name: "Mariana Restrepo Gil",
    decider_title: "Representante legal",
    decider_level: "fact",
    reach_level: "direct",
    reach_whatsapp: true,
    reach_email: true,
    reach_call: true,
    ...overrides,
  };
}

const columns = buildLeadColumns();
const cellOf = (key: string, data: LeadRow) => {
  const column = columns.find((candidate) => candidate.accessorKey === key);
  if (column?.cell === undefined) throw new Error(`Sin columna '${key}'`);
  return render(<>{column.cell({ row: { original: data } })}</>);
};

describe("columnas de la bandeja", () => {
  it("el ORDEN es la prioridad: decisor y alcance, calidad del dato y permiso, y el puntaje antes que «Datos»", () => {
    expect(columns.map((column) => column.accessorKey)).toEqual([
      "name",
      "decider_name",
      "reach_level",
      "quality_status",
      "allows_whatsapp",
      "quality_score",
      "data_count",
      "created_at",
    ]);
  });

  it("«Origen» y «Ciudad» ya no son columnas que se puedan esconder: van en la celda del lead", () => {
    expect(columns.some((column) => column.accessorKey === "source" || column.accessorKey === "city")).toBe(false);
    cellOf("name", row());
    expect(screen.getByText("Google Maps · Bogotá")).toBeInTheDocument();
  });

  it("sin ciudad, la línea dice solo el origen (sin punto colgando)", () => {
    cellOf("name", row({ city: null }));
    expect(screen.getByText("Google Maps")).toBeInTheDocument();
  });

  it("a 1280 px cabe hasta «Calidad»: la suma de anchos mínimos lo permite", () => {
    // Menú abierto: ~940 px de tabla, menos 40 del botón de fin de fila y 44 de la casilla.
    const upToScore = columns.slice(0, 6).reduce((sum, column) => sum + (column.minWidth ?? 150), 0);
    expect(upToScore).toBeLessThanOrEqual(940 - 40 - 44);
  });

  it("en el celular, quién decide y el alcance bajan a una línea bajo el nombre", () => {
    cellOf("name", row());
    const line = screen.getByText("Mariana Restrepo Gil").closest("span.flex");
    expect(line?.className).toContain("sm:hidden");
    expect(screen.getByText(/· Directo/)).toBeInTheDocument();
  });

  it("esa línea dice «(por confirmar)» de una pista y «Sin identificar» si no hay nadie", () => {
    const { unmount } = cellOf("name", row({ decider_name: "Julián Cárdenas Mora", decider_level: "hypothesis", reach_level: "unconfirmed" }));
    expect(screen.getByText(/Julián Cárdenas Mora \(por confirmar\)/)).toBeInTheDocument();
    unmount();
    cellOf("name", row({ decider_name: null, decider_level: null, reach_level: "business" }));
    expect(screen.getByText("Sin identificar")).toBeInTheDocument();
    expect(screen.getByText(/· Solo el negocio/)).toBeInTheDocument();
  });

  it("una persona no lleva esa línea", () => {
    cellOf("name", row({ kind: "person", reach_level: null, decider_name: null, person_line: "Gerente · decide · La Brasa" }));
    expect(screen.queryByText(/Sin identificar/)).toBeNull();
  });

  it("el nombre de quien decide puede ocupar dos renglones y conserva el texto entero", () => {
    cellOf("decider_name", row());
    const name = screen.getByTitle("Mariana Restrepo Gil");
    expect(name.className).toContain("line-clamp-2");
    expect(name.textContent).toBe("Mariana Restrepo Gil");
  });
});
