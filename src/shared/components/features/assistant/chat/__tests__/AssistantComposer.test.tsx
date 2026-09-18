import { act, fireEvent, render, screen } from "@testing-library/react";

import type { RecorderState, VoiceRecorder } from "@/core/hooks/use-voice-recorder";
import { AssistantComposer, COMPOSER_MAX_PX } from "../AssistantComposer";

/**
 * Lo que se prueba aquí es el núcleo que Axel y Alba duplicaban línea por línea
 * (autosize, Enter/Shift+Enter, el vacío no envía) y el contrato de la voz: el
 * micrófono solo existe si quien compone lo pide, y lo dictado se AÑADE al
 * borrador para revisarlo, nunca se envía solo.
 */

const recorder: VoiceRecorder & { state: RecorderState } = {
  state: "idle",
  seconds: 0,
  start: jest.fn(),
  stop: jest.fn(async () => new Blob(["audio"], { type: "audio/webm" })),
  cancel: jest.fn(),
};
let recorderEnabled = false;
jest.mock("@/core/hooks/use-voice-recorder", () => ({
  useVoiceRecorder: (enabled: boolean) => {
    recorderEnabled = enabled;
    return recorder;
  },
}));

const PHRASES = ["¿Qué vendes?", "¿Dónde estás?"] as const;

function view(over: Partial<Parameters<typeof AssistantComposer>[0]> = {}) {
  const onSend = jest.fn();
  const utils = render(
    <AssistantComposer onSend={onSend} placeholder="Escribe…" ariaLabel="Mensaje" {...over} />,
  );
  const textarea = screen.getByLabelText("Mensaje") as HTMLTextAreaElement;
  return { onSend, textarea, ...utils };
}

beforeEach(() => {
  recorder.state = "idle";
  recorder.seconds = 0;
  jest.clearAllMocks();
});

describe("el compositor del asistente", () => {
  it("Enter envía el texto recortado y vacía el campo; Shift+Enter no envía", () => {
    const { onSend, textarea } = view();
    fireEvent.change(textarea, { target: { value: "  Hola Axel  " } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Hola Axel", { voice: false });
    expect(textarea.value).toBe("");
  });

  it("el vacío no envía, y con turno en curso o bloqueado tampoco", () => {
    const { onSend, textarea, rerender } = view();
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    rerender(<AssistantComposer onSend={onSend} placeholder="Escribe…" ariaLabel="Mensaje" busy />);
    fireEvent.change(textarea, { target: { value: "algo" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("crece con el texto hasta el tope y vuelve a su altura al enviar", () => {
    const { textarea } = view();
    Object.defineProperty(textarea, "scrollHeight", { configurable: true, value: 400 });
    fireEvent.change(textarea, { target: { value: "línea\n".repeat(20) } });
    expect(textarea.style.height).toBe(`${String(COMPOSER_MAX_PX)}px`);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(textarea.style.height).toBe("auto");
  });

  it("avisa cuando la persona está escribiendo: con foco o con borrador", () => {
    const onTypingChange = jest.fn();
    const { textarea } = view({ onTypingChange });
    expect(onTypingChange).toHaveBeenLastCalledWith(false);
    fireEvent.focus(textarea);
    expect(onTypingChange).toHaveBeenLastCalledWith(true);
    fireEvent.blur(textarea);
    expect(onTypingChange).toHaveBeenLastCalledWith(false);
    fireEvent.change(textarea, { target: { value: "hola" } });
    expect(onTypingChange).toHaveBeenLastCalledWith(true);
  });

  it("pinta lo que cuelga de él en orden: cápsula, píldoras, pie", () => {
    view({ after: <div data-testid="after">píldoras</div>, footer: <p data-testid="footer">confianza</p> });
    const form = screen.getByRole("button", { name: "Enviar" }).closest("form");
    const after = screen.getByTestId("after");
    const footer = screen.getByTestId("footer");
    expect(form!.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(after.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("teclea las frases del llamador solo mientras el campo está vacío", () => {
    jest.useFakeTimers();
    const { textarea } = view({ placeholderPhrases: PHRASES });
    act(() => {
      jest.advanceTimersByTime(400 + 34 * 4 + 10);
    });
    expect(textarea.placeholder.startsWith("¿Qué")).toBe(true);
    fireEvent.change(textarea, { target: { value: "x" } });
    expect(textarea.placeholder).toBe("Escribe…");
    jest.useRealTimers();
  });
});

describe("la voz es de quien la pide", () => {
  it("sin `voice` no hay micrófono ni grabadora encendida", () => {
    view();
    expect(recorderEnabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Dictar" })).not.toBeInTheDocument();
  });

  it("con `voice` el micrófono aparece, pide permiso al PULSAR y no antes", () => {
    view({ voice: { transcribe: jest.fn(async () => "hola") } });
    expect(recorderEnabled).toBe(true);
    expect(recorder.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dictar" }));
    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it("si el navegador no graba, el botón no se pinta y el texto sigue funcionando", () => {
    recorder.state = "unsupported";
    const { onSend, textarea } = view({ voice: { transcribe: jest.fn() } });
    expect(screen.queryByRole("button", { name: "Dictar" })).not.toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "a mano" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("a mano", { voice: false });
  });

  it("grabando: contador, onda, cancelar; detener transcribe y AÑADE al borrador sin enviar", async () => {
    recorder.state = "recording";
    recorder.seconds = 74;
    const transcribe = jest.fn(async () => "abrimos de nueve a siete");
    const onSend = jest.fn();
    const { rerender } = render(
      <AssistantComposer onSend={onSend} placeholder="Escribe…" ariaLabel="Mensaje" voice={{ transcribe }} />,
    );
    expect(screen.getByText("1:14")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensaje")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Detener y transcribir" }));
      recorder.state = "idle";
      rerender(
        <AssistantComposer onSend={onSend} placeholder="Escribe…" ariaLabel="Mensaje" voice={{ transcribe }} />,
      );
    });

    expect(transcribe).toHaveBeenCalledTimes(1);
    const textarea = screen.getByLabelText("Mensaje") as HTMLTextAreaElement;
    expect(textarea.value).toBe("abrimos de nueve a siete");
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByText(/Lo dicté yo/)).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("abrimos de nueve a siete", { voice: true });
  });
});
