import { render } from "@testing-library/react";

import type { DocumentLifecycleEvent } from "@/core/realtime/events";
import { useDocumentsSocket } from "../use-documents-socket";

type Handler = (payload: DocumentLifecycleEvent) => void;
const handlers = new Map<string, Handler>();
let connected = false;

jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: {}, connected }),
  useSocketEvent: (_socket: unknown, event: string, handler: Handler) => {
    handlers.set(event, handler);
  },
}));

const event = (
  overrides: Partial<DocumentLifecycleEvent> = {},
): DocumentLifecycleEvent => ({
  company_id: "co-1",
  document_id: "d1",
  type_code: "contract",
  type_label: "Contrato",
  number: "CTR-2026-0120",
  status: "rendered",
  contact_id: "c1",
  order_id: "o1",
  payment_id: null,
  error_code: null,
  ...overrides,
});

function Probe({
  onChange,
  enabled,
}: {
  onChange: () => void;
  enabled?: boolean;
}) {
  useDocumentsSocket({
    enabled,
    concerns: (e) => e.order_id === "o1",
    onChange,
  });
  return null;
}

describe("useDocumentsSocket", () => {
  beforeEach(() => {
    handlers.clear();
    connected = false;
  });

  it("recarga en document.issued y document.failed SOLO si el evento concierne a la entidad", () => {
    const onChange = jest.fn();
    render(<Probe onChange={onChange} />);
    expect([...handlers.keys()].sort()).toEqual([
      "document.failed",
      "document.issued",
    ]);
    handlers.get("document.issued")?.(event());
    handlers.get("document.failed")?.(
      event({ status: "failed", error_code: "render_timeout" }),
    );
    expect(onChange).toHaveBeenCalledTimes(2);
    handlers.get("document.issued")?.(event({ order_id: "otro" }));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("apagado, ni escucha ni recarga", () => {
    const onChange = jest.fn();
    render(<Probe onChange={onChange} enabled={false} />);
    handlers.get("document.issued")?.(event());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("recarga en RECONEXIÓN (no en la primera conexión): lo emitido con el socket caído se perdió", () => {
    const onChange = jest.fn();
    const { rerender } = render(<Probe onChange={onChange} />);
    connected = true;
    rerender(<Probe onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    connected = false;
    rerender(<Probe onChange={onChange} />);
    connected = true;
    rerender(<Probe onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
