import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import type { UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelChat } from "../components/AxelChat";

/**
 * Lo que se prueba aquí es DÓNDE aterriza la propuesta que Axel arma dentro de
 * la conversación. No es una preferencia estética: la tarjeta se pintaba al
 * principio del hilo, así que con veinte mensajes de charla el dueño no la veía
 * — y es lo único que hay que decidir.
 */

const mockState = {
  thread: { id: "t1", messages: [] as UiMessage[], thinking: false },
  live: null as {
    turn_id: string;
    iteration: number;
    text: string;
    steps: { name: string; label: string; done: boolean; ms: number | null; productive: boolean | null }[];
    seq: number;
  } | null,
  settled: {} as Record<string, ProposalDTO | null>,
  resolveSettled: jest.fn(),
  ask: jest.fn(),
  answer: jest.fn(),
  retryLast: jest.fn(),
  newThread: jest.fn(),
};

jest.mock("@/modules/cmo/infrastructure/stores/cmo.store", () => ({
  useCmoStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

function message(over: Partial<UiMessage>): UiMessage {
  return {
    id: "m1",
    role: "axel",
    body: "Listo: te dejé armada y apagada la recuperación de carritos.",
    created_at: "2026-08-22T14:00:00.000Z",
    tool_calls: null,
    proposal_id: null,
    question: null,
    ...over,
  };
}

function proposal(over: Partial<ProposalDTO> = {}): ProposalDTO {
  return {
    id: "prop-1",
    kind: "recovery",
    status: "pending",
    source: "chat",
    title: "Persigue los 22 carritos con urgencia real",
    headline: "$8.129.000 en juego",
    rationale: "Hay 22 carritos abiertos y ninguna regla que los persiga.",
    evidence: [],
    risks: [],
    artifacts: [],
    expires_at: "2026-08-25T14:00:00.000Z",
    created_at: "2026-08-22T14:00:00.000Z",
    ...over,
  } as ProposalDTO;
}

function view(
  over: {
    messages?: UiMessage[];
    proposals?: ProposalDTO[];
    settled?: Record<string, ProposalDTO | null>;
    thinking?: boolean;
    live?: typeof mockState.live;
  } = {},
) {
  mockState.thread = {
    id: "t1",
    messages: over.messages ?? [],
    thinking: over.thinking ?? false,
  };
  mockState.settled = over.settled ?? {};
  mockState.live = over.live ?? null;
  return render(
    <AxelChat
      ownerName="Owner"
      briefing={null}
      briefingLoading={false}
      briefingError={null}
      onRetryBriefing={() => undefined}
      briefingHour={16}
      proposals={over.proposals ?? []}
      blocked={null}
      canManage
    />,
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

/* Los dos modos de «Axel trabajando». El respaldo existe porque un turno tarda
   decenas de segundos: sin señal de vida el dueño recarga y pierde el análisis. */
describe("mientras Axel trabaja", () => {
  const step = (over: Partial<{ label: string; done: boolean; ms: number | null }> = {}) => ({
    name: "get_leaks",
    label: "Buscando por dónde se te va la plata",
    done: false,
    ms: null,
    productive: null,
    ...over,
  });

  it("con pasos reales los muestra con su duración, sin frases inventadas", () => {
    view({
      messages: [message({ id: "local-1", role: "owner", body: "¿Cómo vamos?" })],
      thinking: true,
      live: {
        turn_id: "t",
        iteration: 0,
        text: "",
        steps: [
          step({ label: "Leyendo tu embudo y tus ventas", done: true, ms: 420 }),
          step(),
        ],
        seq: 3,
      },
    });

    expect(screen.getByText("Leyendo tu embudo y tus ventas")).toBeInTheDocument();
    expect(screen.getByText("420 ms")).toBeInTheDocument();
    expect(screen.getByText(/1 lectura hasta ahora/)).toBeInTheDocument();
    expect(screen.queryByText(/Revisando tus números/)).not.toBeInTheDocument();
  });

  it("sin socket cae a las frases: un skeleton mudo se lee como «se colgó»", () => {
    view({
      messages: [message({ id: "local-1", role: "owner", body: "¿Cómo vamos?" })],
      thinking: true,
      live: null,
    });

    expect(screen.getByText(/Revisando tus números/)).toBeInTheDocument();
  });

  it("cuando empieza a escribir, el texto reemplaza a los pasos", () => {
    view({
      messages: [message({ id: "local-1", role: "owner", body: "¿Cómo vamos?" })],
      thinking: true,
      live: {
        turn_id: "t",
        iteration: 1,
        text: "Vas mejor en plata",
        steps: [step({ done: true, ms: 310 })],
        seq: 5,
      },
    });

    expect(screen.getByText(/Vas mejor en plata/)).toBeInTheDocument();
    expect(screen.getByText("escribiendo…")).toBeInTheDocument();
    // Los pasos ya no compiten con la respuesta: lo que importa es lo que dice.
    expect(screen.queryByText("310 ms")).not.toBeInTheDocument();
  });
});

describe("la propuesta que nace en la conversación", () => {
  it("se pinta DESPUÉS del mensaje que la anuncia, no al principio del hilo", () => {
    const { container } = view({
      messages: [
        message({ id: "local-1", role: "owner", body: "Ármame algo", proposal_id: null }),
        message({ id: "local-2", proposal_id: "prop-1" }),
      ],
      proposals: [proposal()],
    });

    const card = screen.getByRole("article");
    expect(within(card).getByText("Persigue los 22 carritos con urgencia real")).toBeInTheDocument();

    // El orden en el DOM es el orden de lectura: primero el mensaje, luego la
    // tarjeta. `compareDocumentPosition` lo comprueba sin depender del layout.
    const bubble = screen.getByText(/te dejé armada y apagada/);
    expect(bubble.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Y no se repite arriba: una sola tarjeta en toda la pantalla.
    expect(container.querySelectorAll("article")).toHaveLength(1);
  });

  it("recién llegada se anuncia con el cometa; rehidratada del historial, no", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      proposals: [proposal()],
    });
    expect(screen.getByRole("article").className).toContain("axel-comet-card--new");

    view({
      // Un id de servidor significa que el mensaje viene del transcript: la
      // propuesta ya se anunció en su momento y volver a hacerlo sería ruido.
      messages: [message({ id: "9f1b0c22-0000-4000-8000-000000000000", proposal_id: "prop-1" })],
      proposals: [proposal()],
    });
    expect(screen.getAllByRole("article")[1]?.className).not.toContain("axel-comet-card--new");
  });

  it("una vez decidida se queda en el hilo, con su estado y sin pedir decisión", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      // El tablero solo lista lo que falta decidir: la aprobada llega por `settled`.
      proposals: [],
      settled: { "prop-1": proposal({ status: "approved" }) },
    });

    const card = screen.getByRole("article");
    expect(within(card).getByText("Aprobada")).toBeInTheDocument();
    expect(within(card).getByText("Ver qué quedó")).toBeInTheDocument();
    expect(within(card).queryByText("Revisar")).not.toBeInTheDocument();
    // Baja de tono: el violeta queda para lo que sí falta decidir.
    expect(card.className).toContain("bg-secondary/40");
    expect(card.className).not.toContain("axel-comet-card--new");
  });

  it("la que ya no está no deja tarjeta ni la vuelve a pedir", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      proposals: [],
      settled: { "prop-1": null },
    });

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(mockState.resolveSettled).not.toHaveBeenCalled();
  });

  it("pide la que falta una sola vez", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: "prop-1" })],
      proposals: [],
      settled: {},
    });

    expect(mockState.resolveSettled).toHaveBeenCalledTimes(1);
    expect(mockState.resolveSettled).toHaveBeenCalledWith("prop-1");
  });

  it("la del informe del día sigue arriba: no nació de ningún mensaje", () => {
    view({
      messages: [message({ id: "local-2", proposal_id: null })],
      proposals: [proposal({ id: "prop-9", source: "briefing" })],
    });

    const card = screen.getByRole("article");
    const bubble = screen.getByText(/te dejé armada y apagada/);
    expect(card.compareDocumentPosition(bubble) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/* El primer contacto. Era tres párrafos centrados con pesos parecidos y sin
   orden de lectura, y uno de ellos repetía la nota del compositor. Lo que se
   prueba aquí es la ESTRUCTURA: que haya un primer paso declarado, que cada
   tarjeta diga qué hace, y que la promesa de «nada se envía» aparezca una vez. */
describe("la pantalla de inicio", () => {
  it("declara un primer paso sobre las sugerencias", () => {
    view();

    const eyebrow = screen.getByText("Empieza por aquí");
    const cards = screen.getByRole("button", { name: /¿Cómo vamos\?/ });
    expect(
      eyebrow.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("cada sugerencia dice QUÉ hace, no solo cómo se llama", () => {
    view();

    // El nombre accesible del botón junta label + hint: es exactamente lo que
    // oye un lector de pantalla, y por eso se comprueba sobre él.
    // `[\s\S]*` y no la bandera `s`: el target del tsconfig de la app es previo
    // a es2018 y `dotAll` no compila, aunque el de jest sí lo acepte.
    expect(
      screen.getByRole("button", { name: /Ármame algo[\s\S]*Una campaña o una promo/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /¿Cómo vamos\?[\s\S]*Embudo, ventas y qué cambió/ }),
    ).toBeVisible();
  });

  it("la promesa de que nada se envía solo aparece UNA vez", () => {
    view();

    // Estaba en el hero Y bajo el compositor. Su sitio es el segundo: pegada al
    // botón de enviar, que es donde el dueño duda.
    expect(screen.getAllByText(/nunca envía nada por su cuenta/i)).toHaveLength(1);
    expect(screen.queryByText(/Nada se envía a un cliente sin que tú lo apruebes/)).toBeNull();
  });

  it("la hora del primer informe se lee como dato de servicio, no como propuesta", () => {
    view();

    expect(screen.getByText(/Primer informe/)).toBeVisible();
    expect(screen.getByText("4:00 p.m.")).toBeVisible();
  });

  it("las sugerencias se van al conversar, y con ellas su encabezado", () => {
    view({ messages: [message({})] });

    expect(screen.queryByText("Empieza por aquí")).toBeNull();
    expect(screen.queryByRole("button", { name: /Ármame algo/ })).toBeNull();
  });
});

/* La pregunta con opciones dentro del hilo. Lo que importa no es que se pinte:
   es que solo se pueda responder la ÚLTIMA, porque contestar a una de hace diez
   mensajes mandaría a Axel una decisión sobre una conversación que ya cambió. */
describe("la pregunta con opciones en el hilo", () => {
  const QUESTION = {
    question: "¿A quién le apuntamos?",
    options: [{ label: "Los que no volvieron", hint: null }],
    allow_free_text: false,
  };

  it("va DENTRO de la burbuja de Axel, no como un bloque suelto", () => {
    view({ messages: [message({ question: QUESTION })] });

    const option = screen.getByRole("button", { name: /Los que no volvieron/ });
    /* La burbuja es el ancestro del rótulo «Axel»: su fila de identidad. Se
       ancla ahí y no en el texto del cuerpo porque `closest("div")` sobre el
       cuerpo devuelve el envoltorio del renderer de markdown, que está DENTRO de
       la burbuja y no la representa. */
    const bubble = screen.getByText("Axel").closest("div")?.parentElement;
    expect(bubble).not.toBeNull();
    expect(bubble?.contains(option)).toBe(true);
  });

  it("solo la del ÚLTIMO mensaje se puede tocar", () => {
    view({
      messages: [
        message({ id: "m1", body: "Primera", question: QUESTION }),
        message({ id: "m2", body: "Segunda" }),
      ],
    });

    expect(screen.getByRole("button", { name: /Los que no volvieron/ })).toBeDisabled();
    expect(screen.getByText("Pregunta anterior")).toBeVisible();
  });

  it("tocar una opción responde con su texto", () => {
    view({ messages: [message({ question: QUESTION })] });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Los que no volvieron/ }));
    });

    expect(mockState.answer).toHaveBeenCalledWith("Los que no volvieron");
  });

  it("un turno que solo pregunta no deja una burbuja con un hueco", () => {
    // El prompt le pide a Axel que no repita la pregunta en prosa, así que el
    // cuerpo vacío es lo NORMAL aquí: la pregunta es el mensaje.
    view({ messages: [message({ body: "", question: QUESTION })] });

    expect(screen.getByText("¿A quién le apuntamos?")).toBeVisible();
    expect(screen.getByRole("button", { name: /Los que no volvieron/ })).toBeEnabled();
  });
});
