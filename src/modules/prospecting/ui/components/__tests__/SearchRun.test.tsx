import { render, screen } from "@testing-library/react";

import { SearchRun } from "../SearchRun";
import type { SearchDTO } from "../../../domain/search";

/**
 * Este fichero nace de un informe del dueño: en Búsquedas, el mismo aviso —«Se
 * detuvo por el fallo del 31/08: nadie pidió la página siguiente»— aparecía DOS
 * veces y con dos formatos distintos.
 *
 * La tarjeta tenía dos bloques independientes: uno pintaba el motivo si el
 * estado era `partial` y el otro lo pintaba otra vez si el motivo no era nulo.
 * Una parcial con motivo caía en los dos, y no es un caso raro: los dos barridos
 * del backend cierran así las búsquedas abandonadas.
 */

function search(overrides: Partial<SearchDTO> = {}): SearchDTO {
  return {
    id: "search-1",
    source: "openstreetmap",
    label: "Panaderías de Chapinero",
    status: "partial",
    params: {
      text: null,
      category: "panaderia",
      city: "Bogotá",
      country: "CO",
      radius_m: 3000,
      limit: 100,
      admission: {
        min_score: null,
        min_data: null,
        require: [],
        verified_only: false,
        max_records: null,
      },
    },
    found_count: 25,
    new_count: 20,
    duplicate_count: 0,
    rejected_count: 0,
    filtered_count: 0,
    units_spent: 0,
    estimated_total: null,
    error: null,
    started_at: null,
    finished_at: "2026-08-31T10:00:00.000Z",
    created_at: "2026-08-31T09:00:00.000Z",
    ...overrides,
  } as SearchDTO;
}

const MOTIVO = "Se soltaron leads sin evaluar: la búsqueda se cerró sin llenar el cupo";

describe("SearchRun · un aviso, no dos", () => {
  it("EL BUG: una parcial con motivo lo dice UNA vez", () => {
    render(<SearchRun search={search({ status: "partial", error: MOTIVO })} />);
    expect(screen.getAllByText(MOTIVO)).toHaveLength(1);
  });

  it("y lo dice con el tono de su estado, el mismo de la insignia", () => {
    // Ámbar y no rojo: la insignia dice «Parcial». Que los dos salgan del mismo
    // mapa es lo que impide que se contradigan.
    render(<SearchRun search={search({ status: "partial", error: MOTIVO })} />);
    const notice = screen.getByRole("alert");
    expect(notice.className).toContain("warning");
    expect(notice.className).not.toContain("destructive");
  });

  it("una búsqueda que falló lo pinta en destructivo", () => {
    render(<SearchRun search={search({ status: "failed", error: "El proveedor no respondió" })} />);
    expect(screen.getByRole("alert").className).toContain("destructive");
  });

  it("una parcial sin motivo usa el aviso de reserva", () => {
    render(<SearchRun search={search({ status: "partial", error: null })} />);
    expect(screen.getByText(/sin teléfono ni correo/)).toBeInTheDocument();
  });

  it("una búsqueda que fue bien no pinta aviso", () => {
    render(<SearchRun search={search({ status: "completed", error: null })} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
