import { render, screen } from "@testing-library/react";

import type { EnrichmentRunDTO, RunStepDTO } from "../../../domain/lead";
import { EnrichmentRunCard } from "../EnrichmentRunCard";

/**
 * Este fichero nace de un informe del dueño: «en la lista de fuentes no aparece
 * [Google Maps], no se lista a pesar de que está habilitado».
 *
 * La fila real lo probaba: una pasada CERRADA con el paso de `google_places` en
 * `pending`. El backend saltaba las fuentes de pago en las pasadas automáticas
 * sin cerrar su paso, y `summary()` descuenta los pendientes — así que Google
 * Maps ni contaba como consultada ni decía por qué no lo estaba. Lo mismo le
 * pasaba al extractor del sitio, que SÍ había corrido y se había estrellado con
 * un 404 contra Wikipedia.
 */

function step(overrides: Partial<RunStepDTO> = {}): RunStepDTO {
  return {
    provider: "google_places",
    capability: "enrich_company",
    state: "skipped_paid",
    fields: [],
    units_spent: 0,
    ...overrides,
  } as RunStepDTO;
}

function run(steps: RunStepDTO[]): EnrichmentRunDTO {
  return {
    id: "run-1",
    lead_id: "lead-1",
    status: "completed",
    steps,
    fields_filled: 0,
    units_spent: 0,
    started_at: "2026-09-01T01:51:35.000Z",
    finished_at: "2026-09-01T01:51:41.000Z",
  } as EnrichmentRunDTO;
}

describe("EnrichmentRunCard · toda fuente prometida acaba diciendo algo", () => {
  it("EL BUG: la fuente de pago saltada SE LISTA, y dice que no se consultó", () => {
    render(<EnrichmentRunCard run={run([step()])} />);

    expect(screen.getByText("Google Maps")).toBeInTheDocument();
    expect(screen.getByText(/No se consultó/)).toBeInTheDocument();
  });

  it("saltada NO cuenta como consultada: el titular diría de más", () => {
    render(
      <EnrichmentRunCard
        run={run([
          step(),
          step({ provider: "nominatim", capability: "geocode", state: "no_data" }),
        ])}
      />,
    );

    // Una respondió; la otra ni se preguntó.
    expect(screen.getByText(/1 fuente ·/)).toBeInTheDocument();
  });

  it("una capacidad sin ninguna fuente no imprime un identificador en inglés", () => {
    // Antes el backend metía la capacidad en `provider` y aquí salía literalmente
    // «enrich_person» en la lista de fuentes del lead.
    render(
      <EnrichmentRunCard
        run={run([step({ provider: null, capability: "enrich_person", state: "no_account" })])}
      />,
    );

    expect(screen.queryByText("enrich_person")).not.toBeInTheDocument();
    expect(screen.getByText("Datos de personas")).toBeInTheDocument();
  });

  it("el extractor que se estrelló lo dice: antes seguía «En espera» para siempre", () => {
    render(
      <EnrichmentRunCard
        run={run([
          step({ provider: "site_extractor", capability: "extract_site", state: "failed" }),
        ])}
      />,
    );

    expect(screen.getByText("Su sitio web")).toBeInTheDocument();
    expect(screen.getByText(/No respondió/)).toBeInTheDocument();
  });
});
