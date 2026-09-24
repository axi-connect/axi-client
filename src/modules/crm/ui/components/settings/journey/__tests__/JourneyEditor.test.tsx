import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { JourneyDTO, JourneyStageDTO, PutJourneyDTO } from "@/modules/crm/domain/journey";
import { JourneyEditor, saveErrorTitle } from "../JourneyEditor";

const getJourney = jest.fn();
const putJourney = jest.fn();
const applyJourneyTemplate = jest.fn();
jest.mock("@/modules/crm/infrastructure/services/journey-service.adapter", () => ({
  getJourney: (...args: unknown[]) => getJourney(...args),
  putJourney: (...args: unknown[]) => putJourney(...args),
  applyJourneyTemplate: (...args: unknown[]) => applyJourneyTemplate(...args),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/modules/companies/public", () => ({
  useMyCompany: () => ({ company: { niche_code: "health_beauty" } }),
}));

function stage(over: Partial<JourneyStageDTO> & { stage_id: string; name: string; position: number }): JourneyStageDTO {
  return {
    stage_kind: "custom",
    cadence: null,
    rotting_days: null,
    auto_advance: false,
    moves_on: [],
    ...over,
  };
}

function journey(over: Partial<JourneyDTO> = {}): JourneyDTO {
  return {
    pipeline_id: "p1",
    template_code: "health_beauty",
    switches: { rules_enabled: false, ai_stage_moves_enabled: false },
    stages: [
      stage({
        stage_id: "s1",
        name: "Consulta",
        position: 0,
        stage_kind: "new",
        cadence: { max_attempts: 2, wait_hours: 4, channel: "message", exhausted_action: "let_cool" },
        rotting_days: 2,
        auto_advance: true,
      }),
      stage({
        stage_id: "s2",
        name: "Propuesta",
        position: 1,
        stage_kind: "proposal",
        cadence: { max_attempts: 4, wait_hours: 48, channel: "message", exhausted_action: "mark_lost" },
        rotting_days: 10,
        auto_advance: true,
        moves_on: ["cotización enviada"],
      }),
      stage({ stage_id: "s3", name: "Reagendar", position: 2 }),
    ],
    templates: [
      {
        niche_code: "restaurants",
        name: "Restaurantes",
        stages: [
          { name: "Pedido", stage_kind: "new", cadence: { max_attempts: 2, wait_hours: 2, channel: "message", exhausted_action: "let_cool" }, rotting_days: null },
        ],
      },
      {
        niche_code: "health_beauty",
        name: "Salud y belleza",
        stages: [
          { name: "Cita", stage_kind: "meeting", cadence: { max_attempts: 4, wait_hours: 24, channel: "call_then_message", exhausted_action: "hand_to_human" }, rotting_days: 7 },
          { name: "Asistió", stage_kind: "qualified", cadence: null, rotting_days: null },
        ],
      },
      { niche_code: "software_saas", name: "Software y servicios digitales", stages: [] },
    ],
    ...over,
  };
}

/** El servidor devuelve lo que recibió (lista parcial): así se ve qué fusiona el editor. */
function echo(dto: PutJourneyDTO): JourneyDTO {
  return {
    ...journey(),
    stages: dto.stages.map((sent) => ({ ...journey().stages.find((s) => s.stage_id === sent.stage_id)!, ...sent })),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function sentStage(call: number): PutJourneyDTO["stages"][number] {
  const body = putJourney.mock.calls[call][0] as PutJourneyDTO;
  expect(body.stages).toHaveLength(1);
  return body.stages[0];
}

async function pickKind(stageName: string, optionName: string) {
  fireEvent.keyDown(screen.getByLabelText(`Tipo de la etapa ${stageName}`), { key: "ArrowDown" });
  fireEvent.keyDown(await screen.findByRole("option", { name: optionName }), { key: "Enter" });
}

beforeEach(() => {
  getJourney.mockReset();
  putJourney.mockReset();
  applyJourneyTemplate.mockReset();
  showAlert.mockReset();
});

describe("JourneyEditor", () => {
  it("lista las etapas con su resumen de cadencia y marca la personalizada", async () => {
    getJourney.mockResolvedValue(journey());
    render(<JourneyEditor />);

    expect(await screen.findByText("Consulta")).toBeInTheDocument();
    expect(screen.getByText("2 intentos · cada 4 h · mensaje · máx. 2 días · al agotarse: dejar enfriar")).toBeInTheDocument();
    expect(
      screen.getByText("4 intentos · cada 2 días · mensaje · máx. 10 días · al agotarse: marcar perdida"),
    ).toBeInTheDocument();
    expect(screen.getByText("No se mueve sola")).toBeInTheDocument();
    expect(screen.getByText("Salud, belleza y citas")).toBeInTheDocument();
  });

  it("con los interruptores apagados (como nacen) no promete que nada se mueva solo (Q8)", async () => {
    getJourney.mockResolvedValue(journey({ switches: { rules_enabled: false, ai_stage_moves_enabled: false } }));
    render(<JourneyEditor />);

    expect(await screen.findByText(/El avance automático está apagado para tu negocio: las etapas no se mueven solas todavía\./)).toBeInTheDocument();
    expect(screen.queryByText(/Cada etapa se mueve sola/)).toBeNull();
    expect(screen.queryByText(/El agente también puede/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Propuesta/ }));
    expect(screen.getByText("El avance automático está apagado para tu negocio; hoy solo una persona la mueve.")).toBeInTheDocument();
    // El pie tampoco dice «La mueven solos» ni nombra al agente (V5).
    const panel = document.getElementById("journey-stage-s2") as HTMLElement;
    expect(panel).not.toHaveTextContent(/La mueven solos/);
    expect(panel).not.toHaveTextContent(/agente/);
    expect(panel).toHaveTextContent(/Con el avance automático encendido la moverían: cotización enviada\. Hoy está apagado para tu negocio\. La mueve una persona\./);
  });

  it("sin el campo `switches` (servidor viejo) se lee como apagado (Q8)", async () => {
    const legacy: Partial<JourneyDTO> = journey();
    delete legacy.switches;
    getJourney.mockResolvedValue(legacy as JourneyDTO);
    render(<JourneyEditor />);
    expect(await screen.findByText(/El avance automático está apagado para tu negocio/)).toBeInTheDocument();
  });

  it("reglas encendidas y agente apagado: se mueve con sus eventos, pero el agente no mueve (Q8)", async () => {
    getJourney.mockResolvedValue(journey({ switches: { rules_enabled: true, ai_stage_moves_enabled: false } }));
    render(<JourneyEditor />);

    expect(await screen.findByText(/Cada etapa se mueve sola con sus eventos/)).toBeInTheDocument();
    expect(screen.getByText(/El agente no mueve etapas en tu negocio/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Propuesta/ }));
    expect(screen.getByText("Sus eventos la mueven.")).toBeInTheDocument();
    // Las reglas sí la mueven, pero el pie no promete al agente (V5).
    const panel = document.getElementById("journey-stage-s2") as HTMLElement;
    expect(panel).toHaveTextContent(/La mueven solos: cotización enviada\.Quitar cadencia/);
    expect(panel).not.toHaveTextContent(/agente/);
  });

  it("los dos encendidos: el texto de siempre, con el agente", async () => {
    getJourney.mockResolvedValue(journey({ switches: { rules_enabled: true, ai_stage_moves_enabled: true } }));
    render(<JourneyEditor />);
    expect(await screen.findByText("El agente también puede moverla por su criterio.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Propuesta/ }));
    expect(screen.getByText("Sus eventos la mueven; el agente también puede.")).toBeInTheDocument();
  });

  it("«Se mueve sola» manda SOLO su etapa y fusiona solo esa en la respuesta", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockImplementation((dto: PutJourneyDTO) => Promise.resolve(echo(dto)));
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Propuesta/ }));
    expect(screen.getByText("cotización enviada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(1));
    expect(sentStage(0)).toMatchObject({ stage_id: "s2", auto_advance: false, stage_kind: "proposal" });
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })));
    // Las otras etapas siguen intactas aunque el servidor no las devolviera.
    expect(screen.getByText("Consulta")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("dos guardados concurrentes en etapas distintas: A responde tarde tras B y los dos quedan", async () => {
    getJourney.mockResolvedValue(journey());
    const late = deferred<JourneyDTO>();
    putJourney
      .mockImplementationOnce(() => late.promise) // A: s2
      .mockImplementationOnce((dto: PutJourneyDTO) => Promise.resolve(echo(dto))); // B: s3
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Propuesta/ }));
    fireEvent.click(screen.getByRole("switch")); // A en vuelo
    fireEvent.click(screen.getByRole("button", { name: /Reagendar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Activar cadencia" })); // B
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(2));
    expect(sentStage(0).stage_id).toBe("s2");
    expect(sentStage(1).stage_id).toBe("s3");
    // B ya se aplicó: la etapa 3 tiene cadencia mientras A sigue en vuelo.
    expect(await screen.findByLabelText("Intentos")).toBeInTheDocument();

    await act(async () => {
      late.resolve(echo({ stages: [sentStage(0)] }));
      await late.promise;
    });

    // Los dos cambios están: s3 conserva la cadencia y s2 quedó apagada.
    expect(screen.getByLabelText("Intentos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Propuesta/ }));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("mientras una etapa guarda, sus controles se bloquean y los de las otras no (busy por etapa)", async () => {
    getJourney.mockResolvedValue(journey());
    const late = deferred<JourneyDTO>();
    putJourney.mockImplementationOnce(() => late.promise);
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Propuesta/ }));
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(1));
    // El segundo clic sobre la misma etapa no dispara otro PUT: está en vuelo.
    expect(screen.getByRole("switch")).toBeDisabled();
    fireEvent.click(screen.getByRole("switch"));
    expect(putJourney).toHaveBeenCalledTimes(1);

    // La etapa vecina sigue editable.
    fireEvent.click(screen.getByRole("button", { name: /Reagendar/ }));
    expect(screen.getByRole("button", { name: "Activar cadencia" })).toBeEnabled();

    await act(async () => {
      late.resolve(echo({ stages: [sentStage(0)] }));
      await late.promise;
    });
    fireEvent.click(screen.getByRole("button", { name: /Propuesta/ }));
    expect(screen.getByRole("switch")).toBeEnabled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("«Activar cadencia» nace con la cadencia por defecto; el número guarda al salir y no admite 0", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockImplementation((dto: PutJourneyDTO) => Promise.resolve(echo(dto)));
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Reagendar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Activar cadencia" }));
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(1));
    expect(sentStage(0).cadence).toEqual({
      max_attempts: 3,
      wait_hours: 24,
      channel: "message",
      exhausted_action: "let_cool",
    });

    const attempts = await screen.findByLabelText("Intentos");
    fireEvent.change(attempts, { target: { value: "0" } });
    fireEvent.blur(attempts);
    // Fuera de rango: el error se dice y no se guarda nada.
    expect(screen.getByRole("alert")).toHaveTextContent("Escribe un número entero entre 1 y 20");
    expect(attempts).toHaveAttribute("aria-invalid", "true");
    expect(putJourney).toHaveBeenCalledTimes(1);

    fireEvent.change(attempts, { target: { value: "5" } });
    expect(putJourney).toHaveBeenCalledTimes(1); // teclear no guarda
    fireEvent.blur(attempts);
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(2));
    expect(sentStage(1).cadence?.max_attempts).toBe(5);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Personalizada ↔ tipo: al darle tipo se enciende «Se mueve sola», al volver se apaga", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockImplementation((dto: PutJourneyDTO) => Promise.resolve(echo(dto)));
    render(<JourneyEditor />);
    await screen.findByText("Reagendar");

    await pickKind("Reagendar", "Cita");
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(1));
    expect(sentStage(0)).toMatchObject({ stage_id: "s3", stage_kind: "meeting", auto_advance: true });

    await pickKind("Reagendar", "Personalizada");
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(2));
    expect(sentStage(1)).toMatchObject({ stage_id: "s3", stage_kind: "custom", auto_advance: false });
  });

  it("un tipo ya usado por otra etapa se ofrece deshabilitado", async () => {
    getJourney.mockResolvedValue(journey());
    render(<JourneyEditor />);
    await screen.findByText("Reagendar");

    fireEvent.keyDown(screen.getByLabelText("Tipo de la etapa Reagendar"), { key: "ArrowDown" });
    const taken = await screen.findByRole("option", { name: /Propuesta · ya usado/ });
    expect(taken).toHaveAttribute("aria-disabled", "true");
  });

  it("409 de tipo repetido: nombra el tipo intentado y la etapa vuelve a como estaba", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockRejectedValue(new HttpError({ status: 409, code: "crm/stage_kind_taken", message: "" }));
    render(<JourneyEditor />);
    await screen.findByText("Reagendar");

    await pickKind("Reagendar", "Cita");
    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ tone: "error", title: "No se pudo guardar", description: "Ya hay una etapa de tipo Cita; elige otro tipo" }),
      ),
    );
    expect(screen.getByLabelText("Tipo de la etapa Reagendar")).toHaveTextContent("Personalizada");
  });

  it("si el servidor rechaza, vuelve al estado anterior y lo dice sin código crudo", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockRejectedValue(new HttpError({ status: 403, code: "rbac/permission_denied", message: "" }));
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Propuesta/ }));
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ tone: "error", title: "No se pudo guardar", description: "No tienes permiso para realizar esta acción" }),
      ),
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("el selector de plantillas: las del servidor, el nicho del tenant primero, foco itinerante; aplicar avisa", async () => {
    getJourney.mockResolvedValue(journey());
    applyJourneyTemplate.mockResolvedValue(journey({ template_code: "software_saas" }));
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: "Cambiar" }));
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveTextContent("Salud, belleza y citas");
    expect(radios[0]).toHaveTextContent("tu tipo de negocio");
    // Roving tabindex: Tab entra por el marcado y las flechas recorren.
    expect(radios[0]).toHaveAttribute("tabindex", "0");
    expect(radios[1]).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(radios[0], { key: "ArrowDown" });
    expect(screen.getAllByRole("radio")[1]).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("radio")[1]).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("No borra etapas ni oportunidades.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Software y servicios digitales/ }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar plantilla" }));
    await waitFor(() => expect(applyJourneyTemplate).toHaveBeenCalledWith("software_saas"));
    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Plantilla aplicada: Software y servicios digitales" }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument());
  });

  it("si ni la plantilla aplicada ni el nicho están en la lista, nada viene marcado y «Aplicar» espera", async () => {
    getJourney.mockResolvedValue(
      journey({ template_code: "retail_tech", templates: journey().templates.filter((t) => t.niche_code !== "health_beauty") }),
    );
    render(<JourneyEditor />);
    fireEvent.click(await screen.findByRole("button", { name: "Cambiar" }));
    for (const radio of screen.getAllByRole("radio")) expect(radio).toHaveAttribute("aria-checked", "false");
    expect(screen.getAllByRole("radio")[0]).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "Aplicar plantilla" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Restaurantes/ }));
    expect(screen.getByRole("button", { name: "Aplicar plantilla" })).toBeEnabled();
  });

  it("si aplicar la plantilla falla, el selector se queda abierto con la elección puesta", async () => {
    getJourney.mockResolvedValue(journey());
    applyJourneyTemplate.mockRejectedValue(new Error("boom"));
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: "Cambiar" }));
    fireEvent.click(screen.getByRole("radio", { name: /Restaurantes/ }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar plantilla" }));

    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })));
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Restaurantes/ })).toHaveAttribute("aria-checked", "true");
  });

  it("un error al cargar se dice con reintento", async () => {
    getJourney
      .mockRejectedValueOnce(new HttpError({ status: 403, code: "rbac/permission_denied", message: "" }))
      .mockResolvedValueOnce(journey());
    render(<JourneyEditor />);

    expect(await screen.findByText("No tienes permiso para realizar esta acción")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Consulta")).toBeInTheDocument();
  });
});

describe("saveErrorTitle", () => {
  it("tipo repetido con y sin tipo intentado; otro 409 pide recargar; el resto va por errorMessage", () => {
    const taken = new HttpError({ status: 409, code: "crm/stage_kind_taken", message: "" });
    expect(saveErrorTitle(taken, "proposal")).toBe("Ya hay una etapa de tipo Propuesta; elige otro tipo");
    expect(saveErrorTitle(taken)).toBe("Ya hay una etapa con ese tipo; elige otro tipo");
    expect(saveErrorTitle(new HttpError({ status: 409, code: "crm/stage_in_use", message: "" }))).toBe(
      "No se pudo guardar: el recorrido cambió mientras editabas. Recarga la página",
    );
    expect(saveErrorTitle(new Error("boom"))).toBe("boom");
    expect(saveErrorTitle(undefined)).toBe("No se pudo guardar el recorrido");
  });
});
