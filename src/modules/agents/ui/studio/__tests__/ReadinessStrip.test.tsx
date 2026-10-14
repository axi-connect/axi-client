import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { ReadinessFindingDTO } from "@/modules/agents/domain/readiness";
import { ReadinessStrip } from "../ReadinessStrip";

const requestEnrichmentBackfill = jest.fn();
jest.mock("@/modules/agents/infrastructure/services/recognition-service.adapter", () => ({
  requestEnrichmentBackfill: (...args: unknown[]) => requestEnrichmentBackfill(...args),
}));
let permissions = new Set(["catalog:manage"]);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }),
}));
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }));

const FINDINGS: ReadinessFindingDTO[] = [
  { code: "delivery_without_zones", severity: "blocker", params: {} },
  { code: "orders_stuck_on_form", severity: "blocker", params: { count: 4 } },
  { code: "catalog_not_enriched", severity: "improvement", params: { count: 312, misses: 9 } },
  {
    code: "prompt_hides_facts",
    severity: "improvement",
    params: { phrase: "el cupo es muy limitado", location: { field: "never", index: 1 } },
  },
];

describe("ReadinessStrip (F11 partes críticas)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permissions = new Set(["catalog:manage"]);
    requestEnrichmentBackfill.mockResolvedValue({ queued: true });
  });

  it("sin avisos no pinta nada", () => {
    const { container } = render(<ReadinessStrip agentName="Valentina" findings={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("plegada es una línea; «Ver» abre los avisos, cada uno con una sola acción", () => {
    render(<ReadinessStrip agentName="Valentina" findings={FINDINGS} />);
    const toggle = screen.getByRole("button", { name: /2 cosas frenan las ventas de Valentina/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Ofrece envíos pero no puede cotizarlos")).not.toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ofrece envíos pero no puede cotizarlos")).toBeVisible();
    expect(screen.getByRole("link", { name: /Configurar envíos/ })).toHaveAttribute("href", "/settings/shipping");
    expect(screen.getByRole("link", { name: /Revisar el formulario/ })).toHaveAttribute("href", "/settings/forms");
    expect(screen.getByRole("button", { name: /Generar sinónimos/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver la regla" })).toBeInTheDocument();
    expect(screen.getAllByText("Frena ventas")).toHaveLength(2);
    expect(screen.getAllByText("Mejora")).toHaveLength(2);
  });

  it("«Generar sinónimos» pide el enriquecimiento aquí mismo y deja el aviso resuelto", async () => {
    render(<ReadinessStrip agentName="Valentina" findings={FINDINGS} />);
    fireEvent.click(screen.getByRole("button", { name: /2 cosas frenan/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Generar sinónimos/ }));
    });
    expect(requestEnrichmentBackfill).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Listo: generando sinónimos para 312 productos/)).toBeInTheDocument();
    // La línea ya no cuenta esa mejora
    expect(
      screen.getByRole("button", { name: /2 cosas frenan las ventas de Valentina · 1 mejora/ }),
    ).toBeInTheDocument();
  });

  it("si lo único que quedaba se resolvió aquí, avisa al estudio y la franja se va", async () => {
    const onAllResolved = jest.fn();
    const { container } = render(
      <ReadinessStrip
        agentName="Valentina"
        findings={[FINDINGS[2] as ReadinessFindingDTO]}
        onAllResolved={onAllResolved}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /1 mejora para Valentina/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Generar sinónimos/ }));
    });
    expect(onAllResolved).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
  });

  it("si el enriquecimiento falla, lo dice y el aviso sigue", async () => {
    requestEnrichmentBackfill.mockRejectedValue(new Error("caído"));
    render(<ReadinessStrip agentName="Valentina" findings={FINDINGS} />);
    fireEvent.click(screen.getByRole("button", { name: /2 cosas frenan/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Generar sinónimos/ }));
    });
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })));
    expect(screen.getByRole("button", { name: /Generar sinónimos/ })).toBeEnabled();
  });

  it("sin permiso de catálogo, el arreglo es ir a Reconocimiento", () => {
    permissions = new Set();
    render(<ReadinessStrip agentName="Valentina" findings={FINDINGS} />);
    fireEvent.click(screen.getByRole("button", { name: /2 cosas frenan/ }));
    expect(screen.queryByRole("button", { name: /Generar sinónimos/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a Reconocimiento/ })).toHaveAttribute("href", "/settings/recognition");
  });

  it("solo mejoras: tono neutro, sin la etiqueta de alarma", () => {
    render(<ReadinessStrip agentName="Valentina" findings={FINDINGS.slice(2)} />);
    const toggle = screen.getByRole("button", { name: /2 mejoras para Valentina/ });
    expect(toggle.closest("section")).not.toHaveClass("bg-warning/5");
  });

  it("«Ver la regla» baja a la regla por su frase y la resalta", () => {
    jest.useFakeTimers();
    const scroll = jest.spyOn(Element.prototype, "scrollIntoView");
    render(
      <>
        <ReadinessStrip agentName="Valentina" findings={FINDINGS} />
        <div data-rule-list="never">
          <ol>
            {/* Reordenada sin guardar: la frase manda sobre la posición */}
            <li>
              <button type="button" aria-label="Editar la regla 1">
                No digas cuántas unidades quedan: di que el cupo es muy limitado.
              </button>
            </li>
            <li>
              <button type="button" aria-label="Editar la regla 2">
                Nunca inventes precios.
              </button>
            </li>
          </ol>
        </div>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /2 cosas frenan/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ver la regla" }));
    const rule = screen.getByRole("button", { name: "Editar la regla 1" });
    expect(rule.closest("li")).toHaveClass("ring-2");
    expect(rule).toHaveFocus();
    expect(scroll).toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(rule.closest("li")).not.toHaveClass("ring-2");
    scroll.mockRestore();
    jest.useRealTimers();
  });
});
